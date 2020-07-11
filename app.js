var express = require('express');			// llama el módulo express
var app = express();						// inicializa la variable app de la clase express
var http = require('http');					// solicita el módulo de http
http.globalAgent.maxSockets = 100;			// acá se limitan las conexiones a 100
var bodyParser = require('body-parser');	// body-parser modulo para leer el request del body
var fs = require('fs');						// fs módulo para manejar operaciones de archivos
var server = http.createServer(app);		// acá se crea el servidor para la variable app
var io = require('socket.io');				// acá es utilizan los sockets en la variable io
var ios = io.listen(server);				// acá se escuchan los sockets
var formidable = require('formidable');		// este sistema permite la subida de archivos
var util = require('util');					// acá se requiere el módulo util

// Acá se inicializan las variables
var nickname = [];
var i = [];
var x = [];
var online_member = [];
var temp1;
var socket_id;
var socket_data;
var files_array  = [];
var expiryTime = 8;
var routineTime = 1;

server.listen(8282);		// acá se abre el puerto '8282'

// cofiguración del body parser
app.use(bodyParser.json({	// acá se configuran los límites del json 	
    limit: 1024 * 10000
}));
app.use(bodyParser.text({ 	// acá los límites de texto
    limit: 1024 * 10000
}));
app.use(bodyParser.raw({ 	// se configura el límmmite de filas
    limit: 1024 * 10000
}));
app.use(bodyParser.urlencoded({		// configurando la codificación de url
        extended: true
}));
//configuración de archivos estáticos
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/public/app/upload/images'));
app.use(express.static(__dirname + '/public/app/upload/music'));
app.use(express.static(__dirname + '/public/app/upload/doc'));

// CORS Issue Fix
app.use(function(req, res, next) {														
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//gestionando los sockets
ios.on('connection', function(socket){	

	// Creando un nuevo usuario si no existe
	socket.on('new user', function(data, callback){
		if(nickname[data.username])
			{
				callback({success:false});
			}else{
				callback({success:true});
				socket.username = data.username;
				socket.userAvatar = data.userAvatar;
				nickname[data.username] = socket;
			}
	});

	// enviando la lista de miembros online
	socket.on('get-online-members', function(data){
		var online_member = [];
		i = Object.keys(nickname);
		for(var j=0;j<i.length;j++ )
		{
			socket_id = i[j];
			socket_data = nickname[socket_id];
			temp1 = {"username": socket_data.username, "userAvatar":socket_data.userAvatar};
			online_member.push(temp1);
		}
		ios.sockets.emit('online-members', online_member);		
	});

	// enviando nuevo mensaje
	socket.on('send-message', function(data, callback){
		if (nickname[data.username]) {
			if(data.hasMsg){
				ios.sockets.emit('new message', data);
				callback({success:true});	
			}else if(data.hasFile){
				if(data.istype == "image"){
					socket.emit('new message image', data);
					callback({success:true});
				} else if(data.istype == "music"){
					socket.emit('new message music', data);
					callback({success:true});
				} else if(data.istype == "PDF"){
					socket.emit('new message PDF', data);
					callback({success:true});
				}
			}else{
				callback({ success:false});
			}
		}		
	});
	
	// desconexión de usuario
	socket.on('disconnect', function () {	
		delete nickname[socket.username];
		online_member = [];
		x = Object.keys(nickname);
		for(var k=0;k<x.length;k++ )
    	{
        	socket_id = x[k];
        	socket_data = nickname[socket_id];
        	temp1 = {"username": socket_data.username, "userAvatar":socket_data.userAvatar};
            online_member.push(temp1);
    	}
		ios.sockets.emit('online-members', online_member);            	
   	});
});

// ruta para subir imágenes asincrónicamente
app.post('/v1/uploadImage',function (req, res){
	var imgdatetimenow = Date.now();
	var form = new formidable.IncomingForm({
      	uploadDir: __dirname + '/public/app/upload/images',
      	keepExtensions: true
      });

	form.on('end', function() {
      res.end();
    });
    
    form.parse(req,function(err,fields,files){
		var data = { 
				username : fields.username, 
				userAvatar : fields.userAvatar, 
				repeatMsg : true, 
				hasFile : fields.hasFile, 
				isImageFile : fields.isImageFile, 
				istype : fields.istype, 
				showme : fields.showme, 
				dwimgsrc : fields.dwimgsrc, 
				dwid : fields.dwid,
				serverfilename : baseName(files.file.path), 
				msgTime : fields.msgTime,
				filename : files.file.name,
				size : bytesToSize(files.file.size)
		};
	    var image_file = { 
		        dwid : fields.dwid,
		        filename : files.file.name,
		        filetype : fields.istype,
		        serverfilename : baseName(files.file.path),
		        serverfilepath : files.file.path,
		        expirytime : imgdatetimenow + (3600000 * expiryTime)           
	    };
	    files_array.push(image_file);
		ios.sockets.emit('new message image', data);
    });
});

// ruta para cargar audio de forma asincrónica
app.post('/v1/uploadAudio',function (req, res){
	var userName, useravatar, hasfile, ismusicfile, isType, showMe, DWimgsrc, DWid, msgtime;
	var imgdatetimenow = Date.now();
	var form = new formidable.IncomingForm({
      	uploadDir: __dirname + '/public/app/upload/music',
      	keepExtensions: true
      });


	form.on('end', function() {
      res.end();
    });
    form.parse(req,function(err,fields,files){
		console.log("files : ",files);
		console.log("fields : ", fields);
		var data = { 
				username : fields.username, 
				userAvatar : fields.userAvatar, 
				repeatMsg : true, 
				hasFile : fields.hasFile, 
				isMusicFile : fields.isMusicFile, 
				istype : fields.istype, 
				showme : fields.showme, 
				dwimgsrc : fields.dwimgsrc, 
				dwid : fields.dwid,
				serverfilename : baseName(files.file.path), 
				msgTime : fields.msgTime,
				filename : files.file.name,
				size : bytesToSize(files.file.size)
		};
	    var audio_file = { 
		        dwid : fields.dwid,
		        filename : files.file.name,
		        filetype : fields.istype,
		        serverfilename : baseName(files.file.path),
		        serverfilepath : files.file.path,
		        expirytime : imgdatetimenow + (3600000 * expiryTime)           
	    };
	    files_array.push(audio_file);
		ios.sockets.emit('new message music', data);
    });
});

// ruta para cargar archivos de forma asincrónica
app.post('/v1/uploadPDF',function (req, res){
	var imgdatetimenow = Date.now();
	var form = new formidable.IncomingForm({
      	uploadDir: __dirname + '/public/app/upload/doc',
      	keepExtensions: true
      });

	form.on('end', function() {
      res.end();
    });
    form.parse(req,function(err,fields,files){
		var data = { 
				username : fields.username, 
				userAvatar : fields.userAvatar, 
				repeatMsg : true, 
				hasFile : fields.hasFile, 
				isPDFFile : fields.isPDFFile, 
				istype : fields.istype, 
				showme : fields.showme, 
				dwimgsrc : fields.dwimgsrc, 
				dwid : fields.dwid,
				serverfilename : baseName(files.file.path), 
				msgTime : fields.msgTime,
				filename : files.file.name,
				size : bytesToSize(files.file.size)
		};
	    var pdf_file = { 
		        dwid : fields.dwid,
		        filename : files.file.name,
		        filetype : fields.istype,
		        serverfilename : baseName(files.file.path),
		        serverfilepath : files.file.path,
		        expirytime : imgdatetimenow + (3600000 * expiryTime)           
	    };
	    files_array.push(pdf_file);
		ios.sockets.emit('new message PDF', data);
    });
});

// ruta para verificar el archivo solicitado, existe en el servidor o no
app.post('/v1/getfile', function(req, res){
    var data = req.body.dwid;
    var filenm = req.body.filename;
    var dwidexist = false;
    var req_file_data;
    
    for(var i = 0; i<files_array.length; i++)
    {
        if(files_array[i].dwid == data)
        {
            dwidexist = true;
            req_file_data = files_array[i];
        }
    }

    // CASE 1 : si el archivo existe
    if(dwidexist == true)
    {
    	//CASE 2 : expiró el archivo o no existe
        if(req_file_data.expirytime < Date.now())
        {
	        var deletedfileinfo = { 
                isExpired : true,
	            expmsg : "El archivo ha sido eliminado."
	        	};
	            fs.unlink(req_file_data.serverfilepath, function(err){
	               	if (err) {
	                   	return console.error(err);
	                }
	    				res.send(deletedfileinfo);           
	            });
               var index = files_array.indexOf(req_file_data);
               files_array.splice(index,1);           
        }else{
        	// CASE 3 : El archivo existe y se devuelve el nombre del archivo del servidor en respuesta
            var fileinfo = {
            	isExpired : false, 
            	filename : req_file_data.filename,            
            	serverfilename : req_file_data.serverfilename };
            res.send(fileinfo);
        }
    }else{  
    		// CASE 4 : El archivo no existe       
	    	var deletedfileinfo = { 
	                isExpired : true,
	                expmsg : "El archivo ha sido eliminado."
	        };
	        res.send(deletedfileinfo);       
        }
});

// Llamada de limpieza de rutina
setInterval(function() {routine_cleanup();}, (3600000 * routineTime));

// Size Conversion
function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return 'n/a';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    if (i == 0) return bytes + ' ' + sizes[i]; 
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};
//obtener el nombre del archivo de la ruta del archivo del servidor
function baseName(str)
{
   var base = new String(str).substring(str.lastIndexOf('/') + 1);     
   return base;
}

// Función de limpieza de rutina (eliminación de archivos después de un intervalo específico)
function routine_cleanup()
{
    for(var i=0; i<files_array.length; i++)
    {
            if(Date.now() > files_array[i].expirytime)
            {
                fs.unlink(files_array[i].serverfilepath, function(err) 
                          {
                   if (err) {
                       return console.error(err);
                            }
                            });
                   files_array.splice(i,1);
            }
    }
};
