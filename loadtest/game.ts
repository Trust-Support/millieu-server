import { Room, Client } from "colyseus.js"
import { v4 as uuidv4 } from "uuid"
import {
  uniqueNamesGenerator,
  Config,
  adjectives,
  colors,
  names,
  animals,
} from "unique-names-generator"

export function requestJoinOptions(this: Client, i: number) {
  const randomName: string = uniqueNamesGenerator({
    separator: " ",
    length: 2,
    style: "capital",
    dictionaries: [adjectives, colors, names, animals],
  })

  function getRandomColor() {
    var letters = "0123456789ABCDEF"
    var color = "0X"
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)]
    }
    return color
  }

  function getRandomInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  return {
    requestNumber: i,
    name: randomName,
    uuid: uuidv4(),
    tint: getRandomColor(),
    avatar: getRandomInt(0, 2),
  }
}

export function onJoin(this: Room) {
  console.log(this.sessionId, "joined.")

  setInterval(() => {
    if (Math.floor(Math.random() * (20 - 1 + 1)) + 1 == 5) {
      console.log("** GOING:", this.sessionId)
      let targetX = Math.floor(Math.random() * (4950 - 50 + 1)) + 50
      let targetY = Math.floor(Math.random() * (4950 - 50 + 1)) + 50

      this.send("go", { x: targetX, y: targetY })
    }
  }, 5000)

  this.onMessage("*", (type, message) => {
    // console.log(this.sessionId, "received:", type, message);
  })
}

export function onLeave(this: Room) {
  console.log(this.sessionId, "left.")
}

export function onError(this: Room, err: any) {
  console.log(this.sessionId, "!! ERROR !!", err.message)
}

export function onStateChange(this: Room, state: any) {
  // console.log("new state", Date.now());
}
