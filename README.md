# multer-hash

upload file save as hash that wraps around multer,the file name will also with height and width if is image

# Installation
```bash
npm install multer-hash
```

# Usage

```js
const multerHash = require('multer-hash');
const app = require('express')();
const uploader = multerHash(config,function(err,req,res,next){
	
})
app.post('/yourpath',uploader)


```

## config
same as multer:

 - dest
 - limits
 - field(default as Filedata)

### fileFilter
same as multer,also support file extension array
```
{
	fileFilter:['jpg','png']
}
```

### cachePath
a cachePath for save file to calculate file hash and image size,will choose system cache path if not specify

## result handling
get file path with hashed name in req.publicPath
```js
const multerHash = require('multer-hash');
const uploader = multerHash(config,function(err,req,res,next){
	if(err){
		// handle err
	}else{
		const publicPath = req.publicPath;
		// handle result
	}
})
```

## error handling
specify error code:
```js
	ERROR_CODE = {
	  'IO': 'IO',
	  'INVALID_IMAGE': 'INVALID_IMAGE',
	  'LIMIT_FILE_SIZE': 'LIMIT_FILE_SIZE',
	  'LIMIT_UNEXPECTED_FILE': 'LIMIT_UNEXPECTED_FILE',
	  'UNKNOWN': 'UNKNOWN',
	}
```
###exmaple

```js
const multerHash = require('multer-hash');
const ERROR_CODE = multerHash.ERROR_CODE;
const uploader = multerHash(config,function(err,req,res,next){
	if(err){
		const errorCode = err.code;
		if(errorCode === ERROR_CODE.IO){
			//handle your io error
		}
	}
})
```