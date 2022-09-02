var fs = require('fs');
var path = require('path');

const ADAPT_FOLDER = './adapt';

const generateAdaptIcons = () => {
  var adaptIconsFiles = fs.readdirSync(ADAPT_FOLDER);
  adaptIconsFiles.forEach((file) => {
    if (file.includes('bmc-')) {
      return;
    }
    const fileName = file.slice(file.indexOf('-'));
    const newFileName = `bmc${fileName}`;

    const oldFilePath = path.join(ADAPT_FOLDER, file);
    const newFilePath = path.join(ADAPT_FOLDER, newFileName);

    fs.rename(oldFilePath, newFilePath, () => {
      console.log(`Renaming ${oldFilePath} -> ${newFilePath}`);
    });
  });
};

const generateAdaptTxt = () => {
  var adaptIconsFiles = fs.readdirSync(ADAPT_FOLDER);
  var iconsList = [];
  adaptIconsFiles.forEach((file) => {
    const iconName = file.split('.')[0];
    iconsList.push(`'${iconName}'`);
  });
  fs.writeFile('./adapt.txt', iconsList.join(' | '), () => {
    console.log('Creating adapt.txt');
  });
};

try {
  generateAdaptIcons();
  generateAdaptTxt();
} catch (err) {
  console.error(err);
}
