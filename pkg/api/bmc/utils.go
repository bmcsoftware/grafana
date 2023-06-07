package bmc

import (
	"archive/zip"
	"fmt"
	plugin "github.com/grafana/grafana/pkg/api/bmc/import_export_plugin"
	"github.com/grafana/grafana/pkg/components/simplejson"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func createZip(zipFilePath, tmpFolderPath string) *plugin.ErrorResult {
	zipFile, err := os.Create(zipFilePath)
	if err != nil {
		return plugin.NewErrorResult("Failed to create archive", err)
	}
	defer zipFile.Close()

	// Initialize the zip writer.
	z := zip.NewWriter(zipFile)
	defer z.Close()

	// Zip up the sourceDirPath, files and directories, recursively.
	err = filepath.WalkDir(tmpFolderPath, func(path string, d fs.DirEntry, err error) error {
		// Error with path.
		if err != nil {
			return err
		}

		// Skip directories. Directories will be created automatically from paths to
		// each file to zip up.
		if d.IsDir() {
			return nil
		}

		// Handle formatting path name properly for use in zip file. Paths must be
		// relative, not start with a slash character, and must use forward slashes,
		// even on Windows.  See: https://pkg.go.dev/archive/zip#Writer.Create
		//
		// Directories are created automatically based on the subdirectories provided
		// in each file's path.
		zipPath := strings.Replace(path, tmpFolderPath, "", 1)
		zipPath = strings.TrimPrefix(zipPath, string(filepath.Separator))
		zipPath = filepath.ToSlash(zipPath)

		// Open the path to read from.
		f, err := os.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()

		// Create the path in the zip.
		w, err := z.Create(zipPath)
		if err != nil {
			return err
		}

		// Write the source file into the zip at path from Create().
		_, err = io.Copy(w, f)
		if err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return plugin.NewErrorResult("Failed to create archive", err)
	}
	z.Close()

	return nil
}

func prepareInputs(datasources []*plugin.Datasource) map[string]*simplejson.Json {
	//create a map
	inputs := make(map[string]*simplejson.Json, 0)
	for _, ds := range datasources {
		name := fmt.Sprintf("DS_%s", strings.ReplaceAll(strings.ToUpper(ds.Name), " ", "_"))
		input := simplejson.New()
		input.Set("name", name)
		input.Set("label", ds.Name)
		input.Set("type", "datasource")
		input.Set("pluginId", ds.PluginID)
		input.Set("pluginName", ds.Name)
		if inputs[ds.UID] == nil {
			inputs[ds.UID] = input
		}
	}
	return inputs
}

func prepareVariableInputs(variables []*simplejson.Json) []*simplejson.Json {
	//create a map
	inputs := make([]*simplejson.Json, 0)
	for _, variable := range variables {
		name := variable.Get("name").MustString()
		name = fmt.Sprintf("VAR_%s", strings.ReplaceAll(strings.ToUpper(name), " ", "_"))
		value := variable.Get("query").MustString()
		label := variable.Get("label").MustString()
		typeOf := variable.Get("type").MustString()

		input := simplejson.New()
		input.Set("name", name)
		input.Set("label", label)
		input.Set("value", value)
		input.Set("type", typeOf)
		input.Set("description", "")

		inputs = append(inputs, input)
	}
	return inputs
}

func Contains(s []string, e string) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}

func StrToInt64(s string) int64 {
	i, _ := strconv.ParseInt(s, 10, 64)
	return i
}

func StrToInt64s(s []string) []int64 {
	var i []int64
	for _, v := range s {
		i = append(i, StrToInt64(v))
	}
	return i
}
