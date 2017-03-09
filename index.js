/**
 * Created by Ray on 2017/2/8.
 */
const path = require("path");
const os = require("os");
const fs = require("fs");
const crypto = require("crypto");
const url = require("url");
const multer = require("multer");
const sizeOf = require('image-size');
const mv = require("mv");
const _ = require("lodash");
const series = require('middleware-series');
const errorCode = (code) => {
  const err = new Error();
  err.code = code;
  return err
};
const ImageSuffix = ['BMP', 'GIF', 'JPEG', 'PNG', 'PSD', 'TIFF', 'WEBP', 'SVG', 'JPG'];
const ERROR_CODE = {
  'IO': 'IO',
  'INVALID_IMAGE': 'INVALID_IMAGE',
  'LIMIT_FILE_SIZE': 'LIMIT_FILE_SIZE',
  'LIMIT_UNEXPECTED_FILE': 'LIMIT_UNEXPECTED_FILE',
  'UNKNOWN': 'UNKNOWN',
};
const PUBLIC_PATH = 'publicPath';
const defaultConfig = {
  dest: '',
  cachePath: '',
  limits: {
    fileSize: 1000 * 1000 * 10
  },
  field: 'Filedata',
  fileFilter: null
};
const getCachePath = config => {
  let cachePath;
  if (config.cachePath) {
    cachePath = path.resolve(config.cachePath);
  } else {
    cachePath = path.resolve(os.tmpdir(), 'node-uploader-cache');
  }
  return cachePath
};
const getStorage = config => multer.diskStorage({
  destination: getCachePath(config),
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
});
const getUpload = config => multer({
  storage: getStorage(config),
  limits: config.limits,
  fileFilter: config.fileFilter
}).single(config.field);
const getFileSuffix = name => path.extname(name).replace(/^\./, '').toLowerCase();
const isImage = suffix => ImageSuffix.indexOf(suffix.toUpperCase()) > -1;
const getHash = buffer => {
  const hash = crypto.createHash('md5');
  hash.update(buffer);
  return hash.digest('hex').toLowerCase();
};
const handleFileName = (filePath, fileName) => new Promise((resolve, reject) => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      err.code = ERROR_CODE.IO;
      reject(err)
    }
    let hashName;
    const fileHash = getHash(data);
    const suffix = getFileSuffix(fileName);
    if (isImage(suffix)) {
      try {
        const {width, height} = sizeOf(data);
        hashName = `${fileHash}_${width}x${height}.${suffix}`;
      } catch (err) {
        err.code = ERROR_CODE.INVALID_IMAGE;
        reject(err)
      }
    } else {
      hashName = `${fileHash}.${suffix}`;
    }
    resolve(hashName)
  });
});
const moveFile = (currentPath, name, config) => {
  const targetPath = path.resolve(config.dest, name);
  config.publicPath = config.publicPath || config.dest.replace(/^\/?public/, '');
  const publicPath = url.parse(path.join(config.publicPath, name)).path;
  return new Promise((resolve, reject) => {
    if (fs.existsSync(targetPath)) {
      resolve(publicPath)
    } else {
      mv(currentPath, targetPath, {mkdirp: true}, (error) => {
        if (error) {
          error.code = ERROR_CODE.IO;
          reject(error)
        }
        resolve(publicPath)
      });
    }
  })
};
const multerUploader = (config,cb) => {
  const multerUpload = getUpload(config);
  return function (req, res, next) {
    multerUpload(req, res, (err) => {
      if (err) {
        cb(err,req, res, next)
      } else {
        next()
      }
    })
  };
};
const singleUploader = (config, cb) => function (req, res, next) {
  if (req.file) {
    const file = req.file;
    const filePath = file.path;
    const fileName = file.originalname;
    handleFileName(filePath, fileName)
      .then(hashName => moveFile(filePath, hashName, config))
      .then(publicPath => {
        req[PUBLIC_PATH] = publicPath;
        cb(null, req, res, next);
      })
      .catch(error => {
        cb(error, req, res, next)
      })
  } else {
    cb(errorCode(ERROR_CODE.UNKNOWN), req, res, next)
  }
};
const createHandleFilter = config => {
  let fileFilter = _.cloneDeep(config.fileFilter);
  if (_.isString(fileFilter)) {
    fileFilter = [fileFilter]
  }
  if (_.isArray(fileFilter)) {
    fileFilter = fileFilter.map(item => item.toLowerCase());
    config.fileFilter = function (req, file, cb) {
      if (fileFilter.indexOf(getFileSuffix(file.originalname)) > -1) {
        return cb(null, true)
      }
      cb(errorCode(ERROR_CODE.LIMIT_UNEXPECTED_FILE))
    }
  }
};
const handleConfig = config => {
  if(!config.dest){
    throw new Error('dest should not be empty')
  }
  const copyConfig = _.cloneDeep(defaultConfig);
  const mergeConfig = _.merge(copyConfig, config);
  createHandleFilter(mergeConfig);
  return mergeConfig
};
const uploader = (config, cb) => {
  const mergeConfig = handleConfig(config);
  return series(multerUploader(mergeConfig, cb), singleUploader(mergeConfig, cb))
};
uploader.ERROR_CODE = ERROR_CODE;
uploader.PUBLIC_PATH = PUBLIC_PATH;
module.exports = uploader;

