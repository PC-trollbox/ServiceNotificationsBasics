const app = require('express')();
const http = require('http').Server(app);
const io = require("socket.io-client");
const socket = io("https://servnotifs.pcprojects.tk/");
const fs = require("fs");
var users = require("./users.json") || {};
var codes = [];
var domainNoProtocol = "localhost:3000"; //Change if you are not hosting this locally.
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

setInterval(function(){
	fs.writeFileSync("./users.json", JSON.stringify(users));
}, 5000)

app.get("/", function(req, res) {
	var flag = false;
	for (let user in users) {
		if (users[user].token == req.cookies.userLogin) flag = true;
	}
	if (flag) {
		res.redirect("/secret");
	} else {
		res.sendFile(__dirname + "/login.html");
	}
});
app.get("/register", function(req, res) {
	var flag = false;
	for (let user in users) {
		if (users[user].token == req.cookies.userLogin) flag = true;
	}
	if (flag) {
		res.redirect("/secret");
	} else {
		res.sendFile(__dirname + "/register.html");
	}
});
app.post("/registerStep1", function(req, res) {
	if (users[req.body.username]) return res.redirect("/register");
	fs.readFile(__dirname + "/reg1.html", function(err, text) {
		if (err) return res.status(500).end();
		var text2 = text.toString();
		text2 = text2.replace("%username%", req.body.username);
		text2 = text2.replace("%password%", req.body.password);
		text2 = text2.replace("%snid%", req.body.id);
		var randomcode = "R" + Math.floor(Math.random() * 99) + "I";
		codes.push(randomcode);
		socket.emit("messageUser", req.body.id, "Basics", "The first verification code is " + randomcode + ", type it in the registration form or use the button buttonHttp://" + domainNoProtocol + "/confirmReg?enc=" + encodeURIComponent(JSON.stringify({code: randomcode, username: encodeURIComponent(req.body.username), password: encodeURIComponent(req.body.password), id: encodeURIComponent(req.body.id)})) + " to register. (Don't share the code or button to anyone)", "REG");
		socket.once("errorSend", function() {
			return res.sendFile(__dirname + "/loginFail.html");
		});
		socket.once("successSend", function() {
			res.send(text2);
		});
	});
});
app.get("/confirmReg", function(req, res) {
	req.ducks = JSON.parse(req.query.enc);
	if (users[req.ducks.username]) return res.redirect("/register");
	if (codes.includes(req.ducks.code) && req.ducks.code.startsWith("R") && req.ducks.code.endsWith("I")) {
		users[req.ducks.username] = {
			twofaCode: req.ducks.id,
			token: req.ducks.username + req.ducks.password
		};
		res.sendFile(__dirname + "/logRegCompleted.html");
	} else {
		res.redirect("/register");
	}
});
app.post("/registerDone", function(req, res) {
	if (users[req.body.username]) return res.redirect("/register");
	if (codes.includes(req.body.twofa) && req.body.twofa.startsWith("R") && req.body.twofa.endsWith("I")) {
		users[req.body.username] = {
			twofaCode: req.body.id,
			token: req.body.username + req.body.password
		};
		res.redirect("/");
	} else {
		res.redirect("/register");
	}
});
app.post("/loginStep1", function(req, res) {
	if (!users.hasOwnProperty(req.body.username)) return res.redirect("/");
	if (users[req.body.username].token != (req.body.username + req.body.password)) return res.redirect("/");
	fs.readFile(__dirname + "/log1.html", function(err, text) {
		if (err) return res.status(500).end();
		var text2 = text.toString();
		text2 = text2.replace("%username%", req.body.username);
		text2 = text2.replace("%password%", req.body.password);
		var randomcode = Math.floor(Math.random() * 9999);
		codes.push(randomcode);
		socket.emit("messageUser", users[req.body.username].twofaCode, "Basics", "The 2FA code is " + randomcode + ", type it in the login form or use the button buttonHttp://" + domainNoProtocol + "/confirmLog?enc=" + encodeURIComponent(JSON.stringify({code: randomcode.toString(), username: encodeURIComponent(req.body.username), password: encodeURIComponent(req.body.password)})) + " to log in. (Don't share the code or button to anyone)", "2FA");
		socket.once("errorSend", function() {
			return res.sendFile(__dirname + "/loginFail.html");
		});
		socket.once("successSend", function() {
			res.send(text2);
		});
	});
});
app.get("/confirmLog", function(req, res) {
	req.ducks = JSON.parse(req.query.enc);
	if (!users.hasOwnProperty(req.ducks.username)) return res.redirect("/");
	if (users[req.ducks.username].token != (req.ducks.username + req.ducks.password)) return res.redirect("/");
	if (codes.includes(Number(req.ducks.code)) && !req.ducks.code.startsWith("R") && !req.ducks.code.endsWith("I")) {
		res.cookie("userLogin", users[req.ducks.username].token);
		res.sendFile(__dirname + "/logRegCompleted.html");
	} else {
		res.redirect("/");
	}
});
app.post("/loginDone", function(req, res) {
	if (!users.hasOwnProperty(req.body.username)) return res.redirect("/");
	if (users[req.body.username].token != (req.body.username + req.body.password)) return res.redirect("/");
	if (codes.includes(Number(req.body.twofa)) && !req.body.twofa.startsWith("R") && !req.body.twofa.endsWith("I")) {
		res.cookie("userLogin", users[req.body.username].token);
		res.redirect("/");
	} else {
		res.redirect("/");
	}
});
app.get("/secret", function(req, res) {
	var flag = false;
	for (let user in users) {
		if (users[user].token == req.cookies.userLogin) flag = true;
	}
	if (!flag) {
		res.redirect("/");
	} else {
		res.sendFile(__dirname + "/secret.html");
	}
});
app.post("/logoff", function(req, res) {
	res.clearCookie("userLogin");
	res.redirect("/");
})

http.listen(3000, function() {
	console.log("Server running at localhost:", 3000)
})