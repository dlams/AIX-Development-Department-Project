const express = require("express");
const path = require("path");
const http = require("http");
const socketIO = require("socket.io");
const mysql = require('sync-mysql');
const fs = require('fs')

const app = express();
const server = http.createServer(app);

const cookieParser = require('cookie-parser')
const session = require('express-session')
// const FileStore = require('session-file-store')(session)
const MySqlStore = require("express-mysql-session")(session)



//    *     수정 및 제작 필요 내역 추가 기록     *

// 1. 유저 삭제시 이벤트 추가
//      유저 삭제되면 기분 좋아짐 -> 유저 정보 못찾아서 오류남
//      -> 반대로 다시 같은 아이디로 추가되면 ㄹㅇ 기분 좋아짐 ㅋㅋ


// 5. 코드에 css넣어서 다양한 효과 주기

// 6. 라우터 뭔지 배워보기



const bodyParser = require('body-parser');
const e = require("express");
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, "src")))
// app.use(express.json())
app.use(session({
    secret: "capycat",
    resave: false,
    saveUninitialized: true,
    store: new MySqlStore({
        host: "us-cdbr-east-05.cleardb.net",
        user: "b972920da6aea8",
        password: "9e9384f2",
        database: "heroku_a8e7417c74b061a"
    })
}))

const io = socketIO(server);
const directory = path.join(__dirname, "src");
const connection = new mysql({
        host : "us-cdbr-east-05.cleardb.net",
        user : "b972920da6aea8",
        password : "9e9384f2",
        database : "heroku_a8e7417c74b061a"
});

connection.query(`SET @@auto_increment_increment=1`);


app.get('/', function (req, res) {
    res.redirect("/login")
});

// 로그인 채널
app.get('/login', (req, res) => {
    console.log("Get 접근")
    if (!req.session.logData) {
        res.sendFile(directory + '/login.html')
    } else {
        let room_id = connection.query("select * from ChatRoom")[0]["room_id"]
        // let room_id = connection.query("select room_id from ChatRoom")[0]
        res.redirect(`/channel/${room_id}`)
        // res.redirect("/channel/16")
    }
});

app.post('/login', (req, res) => {
    let user_id = (req.body.id == undefined) ? "" : req.body.id
    let user_pw = (req.body.pw == undefined) ? "" : req.body.pw
    let user_data = connection.query(`select * from users where user_id = "${user_id}";`)[0]
    if (user_data != undefined) {
        if (user_pw == user_data["password"]) {
            req.session.logData = {
                logined: true,
                user_id: req.body.id,
                user_name: user_data["user_name"]
            }
            req.session.save(()=>{
                let room_id = connection.query("select * from ChatRoom")[0]["room_id"]
                // let room_id = connection.query("select room_id from ChatRoom")[0]
                res.redirect(`/channel/${room_id}`)
                // res.redirect('/channel/16')
            })
        } else {
            res.redirect("/login")
        }
    } else {
        res.redirect("/login")
    }
})

// 로그아웃 구현 필요
app.get('/logout', (req, res) => {
    req.session.destroy()
    res.redirect("/login")
    // res.redirect('/login')
})

//본 채널 열람 
app.get('/channel/:id', (req, res) => {
    if (!req.session.logData) {
        res.sendFile(directory + '/login.html')
    }
    var channel_list = ""
    var recent_msg = ""
    var current_chaanel = ""
    var style = ""
    connection.query("select * from ChatRoom").forEach(channel => {
        if (req.params.id == channel["room_id"]) {
            current_chaanel = channel["room_name"]
            style = `style="color: white; font-weight: bold; background: #4a4949;"`            
        } else {
            style = ""
        }
        channel_list = channel_list + `<li id="room_${channel["room_id"]}" class="draggable" draggable="true" ${style}># ${channel["room_name"]}</li>`
    });

    connection.query(`select * from chatmsg where room_id="${req.params.id}"`).forEach(msg => {
        let shown_time
        let cur_time = new Date()
        let pre_time = new Date(msg["time"])
        if (cur_time.getFullYear() == pre_time.getFullYear() && cur_time.getMonth() == pre_time.getMonth() && cur_time.getDay() == pre_time.getDay()) {
            shown_time = `오늘 ${pre_time.getHours() < 12 ? "오전" : "오후"} ${pre_time.getHours() > 12 ? pre_time.getHours()-12 : pre_time.getHours()}:${pre_time.getMinutes()}`
        } else {
            shown_time = `${pre_time.getFullYear()}.${pre_time.getMonth()<10?"0"+pre_time.getMonth():pre_time.getMonth()}.${pre_time.getDay()<10?"0"+pre_time.getDay():pre_time.getDay()}`
        }
        let user = connection.query(`select * from users where user_id="${msg["user_id"]}"`)
        recent_msg = recent_msg + `
        <li class="msg_container" id="chat_${msg["msg_id"]}">
            <img class="user-img" src="https://cdn.discordapp.com/attachments/976481217216122901/977083020454551552/user_b.png" alt="any">
            <span class="user-profile">
                    <span>
                            <span class="user-name">${user[0]["user_name"]}</span>
                            <span class="user-time">${shown_time}</span>
                    </span>
                    <span class="user-message">${msg["msg"]}</span>
                    <span class="user-dummy">
            </span>
        </li>
        `
    });
    // html 설정하기
    fs.readFile(directory+'/index2.html', 'utf8' , (err, data) => {
        var context = data.replace("여기에는 이전 메세지 추가", recent_msg)
        context = context.replace("여기에는 채널 목록 추가", channel_list)
        context = context.replace("할 말을 입력해 주세요", current_chaanel+"에 메시지 보내기")
        context = context.replace("신나는 노래방", "# "+current_chaanel)
        context = context.replace("dummydata", "<div class='dummy_sid'>"+req.session.id+"</div>")
        res.end(context)
    });
});



io.on("connection", (socket) => {
    socket.on("chatting", (data) => {
        data.chat_id = connection.query(`select Auto_increment from information_schema.tables where table_schema = 'heroku_a8e7417c74b061a' and table_name = 'chatmsg';`)[0]["Auto_increment"]

        let user = connection.query(`select * from sessions where session_id = "${data.sid}"`)
        var sp = user[0]["data"].split('"logData":{')
        sp = sp[1].replaceAll('"', '').split(",")
        data.user_id = sp[1].slice(8)
        data.name = `${sp[2]}`.slice(10, -2)

        const {msg, user_id, room_id, time} = data

        connection.query(`insert into chatmsg(msg, user_id, room_id, time) values ('${msg}', '${user_id}', '${room_id}', '${time}')`)
        io.emit("chatting", data)
    });
    
    socket.on("room_create", (name) => {
        data = { room_name: name }
        data.room_id = connection.query(`select Auto_increment from information_schema.tables where table_schema = 'heroku_a8e7417c74b061a' and table_name = 'chatroom';`)[0]["Auto_increment"]
        connection.query(`insert into chatroom(room_name) values ('${name}')`)
        io.emit("room_create", data)
    });

    socket.on("room_replace", (data) => {
        const { room_id, rep_name } = data
        // console.log(data)
        connection.query(`UPDATE chatroom SET room_name = '${rep_name}' WHERE room_id = ${room_id};`)
        io.emit("room_replace", data)
    });

    socket.on("room_delete", (room_id) => {
        connection.query(`DELETE FROM ChatMsg WHERE room_id = ${room_id};`)
        connection.query(`DELETE FROM chatroom WHERE room_id = ${room_id};`)
        io.emit("room_delete", room_id)
    });

    socket.on("chat_replace", (data) => {
        const { chat_id, rep_msg } = data
        connection.query(`UPDATE ChatMsg SET msg = '${rep_msg}' WHERE msg_id = ${chat_id};`)
        io.emit("chat_replace", data)
    });

    socket.on("chat_delete", (data) => {
        connection.query(`DELETE FROM ChatMsg WHERE msg_id = ${data.chat_id};`)
        io.emit("chat_delete", data)
    });
});



server.listen(process.env.PORT || 3000);