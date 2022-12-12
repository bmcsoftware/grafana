package customossencryption

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/util"
	"golang.org/x/crypto/pbkdf2"
	"io"
)

type EncryptionService struct {
}

func ProvideService() *EncryptionService {
	return &EncryptionService{}
}

const (
	saltLength = 8

	AesCfb = "aes-cfb"
	AesGcm = "aes-gcm"

	SecuritySection              = "security.encryption"
	EncryptionAlgorithmKey       = "algorithm"
	DefaultEncryptionAlgorithm   = AesGcm
	EncryptionAlgorithmDelimiter = '*'
)

var logger = log.New("EncryptionLog")

func (e *EncryptionService) Init() error {
	logger.Info("Initialising custom Encryption service", "EncryptionLog", "EncryptionLog")
	/*util.Encrypt = func(payload []byte, secret string) ([]byte, error) {
		alg := setting.Raw.
			Section(SecuritySection).
			Key(EncryptionAlgorithmKey).
			MustString(DefaultEncryptionAlgorithm)

		return e.Encrypt(payload, secret, alg)
	}

	util.Decrypt = e.Decrypt*/

	return nil
}

func (e *EncryptionService) Decrypt(_ context.Context, payload []byte, secret string) ([]byte, error) {
	alg, payload, err := e.deriveEncryptionAlgorithm(payload)
	if err != nil {
		return nil, err
	}

	if len(payload) < saltLength {
		return nil, fmt.Errorf("unable to compute salt")
	}

	salt := payload[:saltLength]
	key, err := encryptionKeyToBytes(secret, string(salt))
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	switch alg {
	case AesGcm:
		return e.decryptGCM(block, payload)
	default:
		return e.decryptCFB(block, payload)
	}
}

func (e *EncryptionService) deriveEncryptionAlgorithm(payload []byte) (string, []byte, error) {
	if len(payload) == 0 {
		return "", nil, fmt.Errorf("unable to derive encryption algorithm")
	}

	if payload[0] != EncryptionAlgorithmDelimiter {
		return AesCfb, payload, nil // backwards compatibility
	}

	payload = payload[1:]
	algDelim := bytes.Index(payload, []byte{EncryptionAlgorithmDelimiter})
	if algDelim == -1 {
		return AesCfb, payload, nil // backwards compatibility
	}

	algB64 := payload[:algDelim]
	payload = payload[algDelim+1:]

	alg := make([]byte, base64.RawStdEncoding.DecodedLen(len(algB64)))

	_, err := base64.RawStdEncoding.Decode(alg, algB64)
	if err != nil {
		return "", nil, err
	}

	return string(alg), payload, nil
}

func (e *EncryptionService) decryptGCM(block cipher.Block, payload []byte) ([]byte, error) {
	logger.Debug("Decrypting in GCM", "EncryptionLog", "EncryptionLog")
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := payload[saltLength : saltLength+gcm.NonceSize()]
	ciphertext := payload[saltLength+gcm.NonceSize():]
	return gcm.Open(nil, nonce, ciphertext, nil)
}

func (e *EncryptionService) decryptCFB(block cipher.Block, payload []byte) ([]byte, error) {
	// The IV needs to be unique, but not secure. Therefore it's common to
	// include it at the beginning of the ciphertext.
	logger.Debug("Decrypting in CFB", "EncryptionLog", "EncryptionLog")
	if len(payload) < aes.BlockSize {
		return nil, errors.New("payload too short")
	}

	iv := payload[saltLength : saltLength+aes.BlockSize]
	payload = payload[saltLength+aes.BlockSize:]
	payloadDst := make([]byte, len(payload))

	stream := cipher.NewCFBDecrypter(block, iv)

	// XORKeyStream can work in-place if the two arguments are the same.
	stream.XORKeyStream(payloadDst, payload)
	return payloadDst, nil
}

func (e *EncryptionService) Encrypt(_ context.Context, payload []byte, secret string) ([]byte, error) {
	alg := setting.Raw.
		Section(SecuritySection).
		Key(EncryptionAlgorithmKey).
		MustString(DefaultEncryptionAlgorithm)
	salt, err := util.GetRandomString(saltLength)
	if err != nil {
		return nil, err
	}

	key, err := encryptionKeyToBytes(secret, salt)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	var encrypted []byte

	switch alg {
	case AesGcm:
		encrypted, err = e.encryptGCM(block, payload, salt)
	default:
		encrypted, err = e.encryptCFB(block, payload, salt)
	}

	if err != nil {
		return nil, err
	}

	prefix := make([]byte, base64.RawStdEncoding.EncodedLen(len([]byte(alg)))+2)
	base64.RawStdEncoding.Encode(prefix[1:], []byte(alg))
	prefix[0] = EncryptionAlgorithmDelimiter
	prefix[len(prefix)-1] = EncryptionAlgorithmDelimiter

	ciphertext := make([]byte, len(prefix)+len(encrypted))
	copy(ciphertext, prefix)
	copy(ciphertext[len(prefix):], encrypted)

	return ciphertext, nil
}

func (e *EncryptionService) encryptGCM(block cipher.Block, payload []byte, salt string) ([]byte, error) {
	logger.Debug("Encrypting in GCM", "EncryptionLog", "EncryptionLog")
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	ciphertext := gcm.Seal(nil, nonce, payload, nil)

	result := make([]byte, saltLength+gcm.NonceSize()+len(ciphertext))

	copy(result[:saltLength], salt)
	copy(result[saltLength:saltLength+gcm.NonceSize()], nonce)
	copy(result[saltLength+gcm.NonceSize():], ciphertext)

	return result, nil
}

func (e *EncryptionService) encryptCFB(block cipher.Block, payload []byte, salt string) ([]byte, error) {
	// The IV needs to be unique, but not secure. Therefore it's common to
	// include it at the beginning of the ciphertext.
	logger.Debug("Encrypting in CFB", "EncryptionLog", "EncryptionLog")
	ciphertext := make([]byte, saltLength+aes.BlockSize+len(payload))
	copy(ciphertext[:saltLength], salt)

	iv := ciphertext[saltLength : saltLength+aes.BlockSize]
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return nil, err
	}

	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext[saltLength+aes.BlockSize:], payload)
	return ciphertext, nil
}

func (s *EncryptionService) EncryptJsonData(ctx context.Context, kv map[string]string, secret string) (map[string][]byte, error) {
	encrypted := make(map[string][]byte)
	for key, value := range kv {
		encryptedData, err := s.Encrypt(ctx, []byte(value), secret)
		if err != nil {
			return nil, err
		}

		encrypted[key] = encryptedData
	}
	return encrypted, nil
}

func (s *EncryptionService) DecryptJsonData(ctx context.Context, sjd map[string][]byte, secret string) (map[string]string, error) {
	decrypted := make(map[string]string)
	for key, data := range sjd {
		decryptedData, err := s.Decrypt(ctx, data, secret)
		if err != nil {
			return nil, err
		}

		decrypted[key] = string(decryptedData)
	}
	return decrypted, nil
}

func (s *EncryptionService) GetDecryptedValue(ctx context.Context, sjd map[string][]byte, key, fallback, secret string) string {
	if value, ok := sjd[key]; ok {
		decryptedData, err := s.Decrypt(ctx, value, secret)
		if err != nil {
			return fallback
		}

		return string(decryptedData)
	}

	return fallback
}

// Key needs to be 32bytes
func encryptionKeyToBytes(secret, salt string) ([]byte, error) {
	return pbkdf2.Key([]byte(secret), []byte(salt), 10000, 32, sha256.New), nil
}
