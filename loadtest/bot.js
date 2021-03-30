const poissonProcess = require("poisson-process")
const _ = require('lodash')

let userList = []

const ALL_AVATARS = [
    "6762333a-fa08-4f2f-8d6b-c16af28ab2b4",
    "5a8cf736-d565-47c9-bdef-0ed2548e236b",
    "5ec63422-111e-47c5-aceb-ce7f6b077030",
    "620e6e39-9ae2-42a2-b0bb-73a0e5de9422",
    "7e3d2388-0e99-4dbf-8314-76bb78a96c10",
    "9a8169a4-2eaf-4f0b-a6ff-fbaa75d13d2c",
    "abf112de-6ed7-4425-906e-f4362dd452db",
    "60c0feeb-a3c6-4e72-99c8-f0219cea0504",
    "2d254abc-089a-41a9-95c2-830310195fe6",
    "f8c6180c-d129-42a9-b508-fc4e04b4a26e",
    "7b8a3197-44a9-43c5-ac40-fed6a8154c77",
    "97b691b5-a5cf-44a3-be89-539d06de071a",
    "5426221f-d83a-4dde-a31c-228d5c3ea3c7",
    "bad17f12-109a-415a-99e3-3dd772dca0e1",
    "b84b7242-511a-4bb1-ab4c-a23750a8e195",
    "82a4ae20-ee4f-446c-9fe2-77fc0822f080",
    "9396422c-e8ea-40ee-923d-471667c23606",
    "6ac6d820-8e02-4ea9-9820-57c13e30583c",
    "c1dba783-2f47-44c5-8f08-2a5cdf6c686c",
    "61ecabc0-e36f-48ef-9116-aae165b6f746",
    "b2d59b10-f752-4386-be1a-d9a176720b34",
    "71d2c750-c4dc-40ee-be2e-45bf5aa58c4d",
    "40a35419-19bc-41a0-a868-e8261f921dd5",
    "0902b218-6803-4d2c-adc9-9038d2791871",
    "5d93910d-8b14-4a87-aee8-1c4e2b503662",
    "dca04d8e-3cee-4a36-b07e-102862b38fbe",
    "66fec836-da91-4905-95d8-46bb33c31814",
    "b994597c-2768-4ef6-a6d7-97ed600aa867",
    "2dca1825-c6cc-4d50-8246-0e7db849ef57"
    ]

const CRICKET = '60c0feeb-a3c6-4e72-99c8-f0219cea0504'

function getRandomInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
  }  

exports.requestJoinOptions = function (i) {
    const randomAvatar = _.sample(ALL_AVATARS)
    return {
        requestNumber: i,
        name: 'test-bot',
        avatar: randomAvatar,
	npc: true
      }
}

exports.onJoin = function () {
    console.log(this.sessionId, "joined.");

    this.onMessage("*", (type, message) => {
        console.log("onMessage:", type, message);
    });

    const p = poissonProcess.create(25000, () => {
        console.log('GOING', this.sessionId)
        this.send("go", { x: userList[this.sessionId].x + getRandomInt(-400, 400), y: userList[this.sessionId].y + getRandomInt(-400, 400)});
    })
    p.start()
}

exports.onLeave = function () {
    console.log(this.sessionId, "left.");
}

exports.onError = function (err) {
    console.log(this.sessionId, "!! ERROR !!", err.message);
}

exports.onStateChange = function (state) {
    userList = state.players
    // console.log(this.sessionId, "new state:", state);
}
