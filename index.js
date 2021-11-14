const app = require('express')();
const http = require('http').Server(app);
const io = require("socket.io-client");
const socket = io("https://servicenotifications.tbsharedaccount.repl.co/");
const fs = require("fs");
var users = require("./users.json") || {};
var codes = [];
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
		socket.emit("messageUser", req.body.id, "Basics", "The first verification code is " + randomcode + ", type it in the registration form.", "REG");
		socket.once("errorSend", function() {
			return res.sendFile(__dirname + "/loginFail.html");
		});
		res.send(text2);
	});
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
		socket.emit("messageUser", users[req.body.username].twofaCode, "Basics", "The 2FA code is " + randomcode + ", type it in the login form.", "2FA");
		socket.once("errorSend", function() {
			return res.sendFile(__dirname + "/loginFail.html");
		});
		res.send(text2);
	});
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
