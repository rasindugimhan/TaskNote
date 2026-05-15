const Jimp = require('jimp');
Jimp.read('n.png')
  .then(image => {
    return image.writeAsync('n_fixed.png');
  })
  .then(() => {
    console.log('Done!');
  })
  .catch(err => console.error(err));
