"use strict"

const socket = io();
const chatList = document.querySelector(".chatting-list")
const ChannelList = document.querySelector(".room-group")
const chatInput = document.querySelector(".chatting-input")
const displayContainer = document.querySelector(".display-container")

const drop_menu = document.querySelectorAll('.drop-item')
const Roominput = document.querySelector('.dropdown-input')
const drop_screen = document.querySelector("#dropdown-to-input")

var Clicked_Channel, Clicked_Msg, current_channel_id, sid
// var Clicked_Msg

//  ###                                         ###
//  ###               로딩 후 구성               ###
//  ###                                         ###

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

window.onload = () => {
    var chatrooms = document.querySelector(".room-group")
    if (chatrooms.hasChildNodes()) {
        chatrooms.childNodes.forEach(chatroom => {
            addChannelEvent(chatroom)
        })
    }
    current_channel_id = window.location.pathname.replace("/channel/", "")
    sid = document.querySelector(".dummy_sid").innerHTML    
}

function clearReplaceState(el) {
    if (el != undefined) {
        el.classList.remove("msg_edit")
        if (el.lastChild.classList !== undefined) {
            if (el.lastChild.classList.contains("msg_edit_input")) {
                el.lastChild.remove()
            }
        }
    }
}

function openVoidGUI(title) {
    drop_screen.childNodes[1].innerHTML = title
    drop_screen.classList.add("active")
    Roominput.value = ""
    Roominput.focus()
}

function addChannelEvent(li) {
    li.addEventListener('click', () => {
        if (li.id.substr(5) != current_channel_id) {
            location.href = `/channel/${li.id.substr(5)}`
        }
    });
    li.addEventListener('dragstart', () => {
        li.classList.add('dragging')
    });
    li.addEventListener('dragend', () => {
        li.classList.remove('dragging')
    });
}

function getFormatDate(date){
    var year = date.getFullYear()
    var month = (1 + date.getMonth())
    month = month > 10 ? month : "0" + month
    var day = date.getDate()
    day = day > 10 ? day : "0" + day
    var hours = date.getHours()
    hours = hours > 10 ? hours : "0" + hours
    var minutes = date.getMinutes()
    minutes =  minutes > 10 ? minutes : "0" + minutes
    var seconds = date.getSeconds()
    seconds = seconds > 10 ? seconds : "0" + seconds
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} `
}


//  ###                                         ###
//  ###               웹 소켓 송신               ###
//  ###                                         ###

chatInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        if (chatInput.value !== "") {
            const send_data = {
                msg: chatInput.value,
                time: getFormatDate(new Date()),
                room_id: current_channel_id,
                user_img: 1,
                sid: sid
            }
            socket.emit("chatting", send_data)
            chatInput.value = ""
        }

    }
});


//  ###                                         ###
//  ###               웹 소켓 수신               ###
//  ###                                         ###

socket.on("chatting", (data) => {
    // console.log(document.cookie);
    const { name, room_id, msg, user_img, time, chat_id } = data;
    // 같은 방인지 확인하고 스크롤 조정
    if (room_id == current_channel_id){
        let shown_time
        let cur_time = new Date()
        let pre_time = new Date(time)
        if (cur_time.getFullYear() == pre_time.getFullYear() && cur_time.getMonth() == pre_time.getMonth() && cur_time.getDay() == pre_time.getDay()) {
            shown_time = `오늘 ${pre_time.getHours() < 12 ? "오전" : "오후"} ${pre_time.getHours() > 12 ? pre_time.getHours()-12 : pre_time.getHours()}:${pre_time.getMinutes()}`
        } else {
            shown_time = `${pre_time.getFullYear()}.${pre_time.getMonth()<10?"0"+pre_time.getMonth():pre_time.getMonth()}.${pre_time.getDay()<10?"0"+pre_time.getDay():pre_time.getDay()}`
        }

        const li = document.createElement("li")
        li.classList.add("msg_container")
        li.id = `chat_${chat_id}`;
        const desc = `
        <img class="user-img" src="https://cdn.discordapp.com/attachments/976481217216122901/977083020454551552/user_b.png" alt="any">
        <span class="user-profile">
            <span>
                <span class="user-name">${name}</span>
                <span class="user-time">${shown_time}</span>
            </span>
            <span class="user-message">${msg}</span>
            <span class="user-dummy">
        </span>`
        li.innerHTML = desc
        if (displayContainer.scrollHeight - displayContainer.clientHeight <= displayContainer.scrollTop + 1) {
            chatList.appendChild(li)
            displayContainer.scrollTo(0, displayContainer.scrollHeight)
        } else {
            chatList.appendChild(li)
        }
    } else {
        document.getElementById(`room_${room_id}`).style.color = "white";
    }
})

// 채널 생성 파트
socket.on("room_create", (data) => {
    const { room_id, room_name } = data;
    const li = document.createElement("li")
    li.id = `room_${room_id}`
    li.classList.add("draggable")
    li.draggable = true
    li.innerHTML = `# ${room_name}`
    ChannelList.appendChild(li)
    addChannelEvent(li)
});

// 채널 수정 파트
socket.on("room_replace", (data) => {
    const { room_id, rep_name } = data
    document.getElementById(`room_${room_id}`).innerHTML = "# " + rep_name
    if (room_id == current_channel_id) {
        document.querySelector("label").innerHTML = "# " + rep_name
    }
});

// 채널 삭제 파트
socket.on("room_delete", (room_id) => {
    if (room_id == current_channel_id) {
        location.href= `/channel/${ChannelList.childNodes[1].id.substr(5)}`
    }
    document.getElementById(`room_${room_id}`).remove()
});

// 메시지 수정 파트
socket.on("chat_replace", (data) => {
    const { room_id, chat_id, rep_msg } = data
    if (room_id == current_channel_id) {
        document.getElementById(`chat_${chat_id}`).childNodes[3].childNodes[3].innerHTML = rep_msg
    }
});

// 메시지 삭제 파트
socket.on("chat_delete", (data) => {
    const { room_id, chat_id } = data
    if (room_id == current_channel_id) {
        document.getElementById(`chat_${chat_id}`).remove()
    }
});



//  ###                                          ###
//  ###             콘텍스트 메뉴 설정            ###
//  ###                                          ###

window.addEventListener("contextmenu", function(event){
    clearReplaceState(Clicked_Msg)

    document.getElementById("dropdown-menu-onRoom").classList.remove("active")
    document.getElementById("dropdown-menu-onVoid").classList.remove("active")
    document.getElementById("dropdown-menu-onMsg").classList.remove("active")
    drop_screen.classList.remove("toactive")
    // 채널 위에서 우클릭
    if (event.target.classList.contains("draggable")) {
        event.preventDefault();
        Clicked_Channel = event.target
        var contextElement = this.document.getElementById("dropdown-menu-onRoom")
        contextElement.style.top = event.clientY + "px";
        contextElement.style.left = event.clientX + "px";
        contextElement.classList.add("active")
    // 채널 아래에서 우클릭
    } else if (event.target.classList.contains("room-list")) {
        event.preventDefault();
        var contextElement = this.document.getElementById("dropdown-menu-onVoid")
        contextElement.style.top = event.clientY + "px";
        contextElement.style.left = event.clientX + "px";
        contextElement.classList.add("active")
    // 유저 메시지 우클릭
    } else {
        let par1 = event.target.parentNode.classList.contains("msg_container")
        let par2 = event.target.parentNode.parentNode.classList.contains("msg_container")
        let par3 = event.target.parentNode.parentNode.parentNode.classList.contains("msg_container")
        if (event.target.classList.contains("msg_container") || par1 || par2 || par3) {
            event.preventDefault();
            Clicked_Msg = event.target
            var contextElement = this.document.getElementById("dropdown-menu-onMsg")
            contextElement.style.top = event.clientY + "px";
            contextElement.style.left = event.clientX + "px";
            contextElement.classList.add("active")
        }
    }
});

window.addEventListener("click", function(event){
    if (!(event.target.classList.contains("fa-new") || event.target.classList.contains("fa-rename") || event.target.classList.contains("dropdown-input"))) {
        drop_screen.classList.remove("active")
    }
    if (!(event.target.classList.contains("msg_edit_input") || event.target.classList.contains("fa-rename"))) {
        clearReplaceState(Clicked_Msg)
        Clicked_Channel, Clicked_Msg = undefined, undefined
    }
    document.getElementById("dropdown-menu-onRoom").classList.remove("active")
    document.getElementById("dropdown-menu-onVoid").classList.remove("active")
    document.getElementById("dropdown-menu-onMsg").classList.remove("active")
});

// 채널 이름 입력 창
Roominput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        if (drop_screen.childNodes[1].innerHTML == "채널 만들기") {
            if (Roominput.value !== "") {
                drop_screen.classList.remove("active")
                socket.emit("room_create", Roominput.value)
            }
        } else {
            if (Roominput.value !== "") {
                drop_screen.classList.remove("active")
                let send_data = {
                    room_id: Clicked_Channel.id.substr(5),
                    rep_name: Roominput.value
                }
                socket.emit("room_replace", send_data)
            }
        }
            
    }
});

drop_menu.forEach((li) => {
    li.addEventListener('click', () => {
        if (li.textContent.trim() === "새 채널 만들기") {
            openVoidGUI("채널 만들기")
        } else if (li.textContent.trim() === "채널 이름 바꾸기") {
            openVoidGUI("채널 이름 변경")

        } else if (li.textContent.trim() === "채널 삭제하기") {
            socket.emit("room_delete", Clicked_Channel.id.substr(5))
        } else if (li.textContent.trim() === "메시지 수정" || li.textContent.trim() === "메시지 삭제") {
            if (!Clicked_Msg.classList.contains("msg_container")) {
                Clicked_Msg = Clicked_Msg.parentNode
                if (!Clicked_Msg.classList.contains("msg_container")) {
                    Clicked_Msg = Clicked_Msg.parentNode
                    if (!Clicked_Msg.classList.contains("msg_container")) {
                        Clicked_Msg = Clicked_Msg.parentNode
                    }
                }
            }
            if (li.textContent.trim() === "메시지 수정") {
                // 자기 메시지인지부터 확인
                var editInput = document.createElement('input')
                editInput.classList.add("msg_edit_input")
                editInput.value = Clicked_Msg.childNodes[3].childNodes[3].innerHTML
                Clicked_Msg.appendChild(editInput)
                Clicked_Msg.classList.add("msg_edit")
                editInput.focus()
                editInput.addEventListener('keypress', function (e) {
                    if (e.key === 'Enter') {
                        let send_data = {
                            room_id: current_channel_id,
                            chat_id: Clicked_Msg.id.substr(5),
                            rep_msg: editInput.value
                        }
                        if (editInput.value === "") {
                            delete send_data.rep_msg
                            socket.emit("chat_delete", send_data)
                        } else {
                            socket.emit("chat_replace", send_data)
                        }
                        clearReplaceState(Clicked_Msg)
                    }
                });
            } else if (li.textContent.trim() === "메시지 삭제") {
                let send_data = {
                    room_id: current_channel_id,
                    chat_id: Clicked_Msg.id.substr(5)
                }
                socket.emit("chat_delete", send_data)
            }
        }
    })
})