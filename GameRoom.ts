import { Room, Client } from "colyseus"
import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema"
import EasyStar from "easystarjs"
// import crypto from "crypto"
// import querystring from "querystring"
import fs from "fs"
import get from "lodash/get"
// import sample from "lodash/sample"
import clamp from "lodash/clamp"
import isNumber from "lodash/isNumber"
// import * as Sentry from "@sentry/node"
import mongoose from "mongoose"
// import sanity from "@sanity/client"

// const sanityClient = sanity({
//   projectId: "bu5rnal5",
//   dataset: "production",
//   useCdn: false,
// })

// const SSO_SECRET = "nwvSuAVLUE5L"
const MAX_STACK_HEIGHT = 200
const MAX_USERNAME_LENGTH = 100
const MAX_CHATMESSAGE_LENGTH = 1000
const MONGODB_URI = "mongodb://localhost:27017/details"

const rawdata = fs.readFileSync("grid.json")
const mapMatrix = JSON.parse(rawdata.toString()).data

mongoose.connect(MONGODB_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
})

const connection = mongoose.connection
const MongoSchema = mongoose.Schema
const message = new MongoSchema(
  {
    text: {
      type: String,
    },
    uuid: {
      type: String,
    },
    name: {
      type: String,
    },
    username: {
      type: String,
    },
    authenticaed: {
      type: Boolean,
    },
    directed: {
      type: Boolean,
    },
    directedTo: {
      type: String,
    },
    msgId: {
      type: String,
    },
    tint: {
      type: String,
    },
    timestamp: {
      type: Number,
    },
    room: {
      type: Number,
    },
    removed: {
      type: Boolean,
    },
  },
  { collection: "Messages" }
)

const MongoMessage = mongoose.model("Message", message)

console.log('connecting to mongo....')
connection.once("open", () => {
  console.log("MongoDB database connection established successfully")
})

// TILE TYPES =>
// 0 = white
// 1 = black
// 2 = yellow
// 3 = red
// 4 = green
// 5 = blue
// 6 = magenta
// 7 = cyan
// 8 = purple
// 9 = teal

// __ Setup collision grid
const easystar = new EasyStar.js()
easystar.setGrid(mapMatrix)
easystar.setAcceptableTiles([0, 2, 3, 4, 5, 6, 7, 8, 9])
easystar.setTurnPenalty(1)
easystar.setHeuristicsFactor(2)

class IP extends Schema {
  @type("string") address: string
}

class Waypoint extends Schema {
  @type("number") x: number
  @type("number") y: number
  @type("number") area: number
  @type("string") direction: string

  constructor(x: number, y: number, area?: number, direction?: string) {
    super({})

    this.x = x
    this.y = y
    this.area = area
    this.direction = direction
  }
}

class Path extends Schema {
  @type([Waypoint]) waypoints = new ArraySchema<Waypoint>()
}

class Player extends Schema {
  @type("boolean") moderator: boolean
  @type("boolean") npc: boolean
  @type("string") uuid: string
  @type("string") name: string
  @type("string") discourseName: string
  @type("string") slug: string
  @type("string") tint: string
  @type("string") ip: string
  @type("string") avatar: string
  @type("boolean") connected: boolean
  @type("number") x: number
  @type("number") y: number
  @type("number") area: number
  @type("boolean") authenticated: boolean
  @type("string") carrying: string
  @type(Path) path: Path = new Path()
  @type(Path) fullPath: Path = new Path()
}

class CaseStudy extends Schema {
  @type("string") uuid: string
  @type("string") caseStudyId: string
  @type("string") name: string
  @type("string") slug: string
  @type("string") category: string
  @type("number") tint: number
  @type("number") age: number
  @type("number") x: number
  @type("number") y: number
  @type("string") carriedBy: string
  @type("number") timestamp: number
}

class Message extends Schema {
  @type("string") msgId: string
  @type("string") uuid: string
  @type("string") name: string
  @type("string") username: string
  @type("boolean") authenticated: boolean
  @type("boolean") directed: boolean
  @type("string") directedTo: string
  @type("string") text: string
  @type("string") tint: string
  @type("number") timestamp: number
  @type("number") room: number
  @type("boolean") removed: boolean

}

class State extends Schema {
  @type([IP]) blacklist = new ArraySchema<IP>()
  @type({ map: Player }) players = new MapSchema()
  @type({ map: CaseStudy }) caseStudies = new MapSchema()
  @type([Message]) messages = new ArraySchema<Message>()
}

const calculateDirection = (diffX: Number, diffY: Number) => {
  if (diffX === 0 && diffY === -10) return "front"
  else if (diffX === 10 && diffY === 0) return "right"
  else if (diffX === 0 && diffY === 10) return "back"
  else if (diffX === -10 && diffY === 0) return "left"
  else if (diffX === 0 && diffY === 0) return "rest"
  throw new Error("These differences are not valid: " + diffX + ", " + diffY)
}

// const getRandomInt = (min: number, max: number) =>
//   Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) +
//   Math.ceil(min)

export class GameRoom extends Room {
  // __ Global settings
  autoDispose = false
  maxClients = 700

  onCreate(options: any) {
    this.setState(new State())

    // __ Restore messages from database
    // __ 1 => GET LAST 20 MESSAGES (that are not removed and not broad- or narrowcast) sorted by timestamp
    const restoreMessages = async () => {
      console.log('Restoring messages...')
      const messagesToRestore = await MongoMessage.find().sort({ timestamp: 'desc'});
      // console.dir(messagesToRestore)
      console.log('Number of messages:', messagesToRestore.length)
      // // __ 2 => WRITE TO MESSAGE STATE
      messagesToRestore.reverse().forEach((m: Message) => {
        let newMessage = new Message()
        newMessage.msgId = get(m, "msgId", "No msgId")
        newMessage.text = get(m, 'text', '')
        newMessage.name = get(m, "name", "No name")
        newMessage.username = get(m, "username", "")
        newMessage.directed = get(m, "directed", false)
        newMessage.directedTo = get(m, "directedTo",'')
        newMessage.authenticated = get(m, "authenticated",false)
        newMessage.uuid = get(m, "uuid", "No UUID")
        newMessage.tint = get(m, "tint", "No tint")
        newMessage.room = get(m, "room", 2)
        newMessage.timestamp = get(m, "timestamp", Date.now())
        // console.log('==> Write message', m.msgId)
        // console.dir(newMessage)
        this.state.messages.push(newMessage)
      })
    }
    restoreMessages()

    // __ Blacklist IP address
    this.onMessage("blacklist", (client, payload) => {
      try {
        if (
          !this.state.blacklist.find((ip: IP) => ip.address == payload.address)
        ) {
          // __ Add IP to list
          let newIP = new IP()
          newIP.address = payload.address
          this.state.blacklist.push(newIP)
          // __ Check if user with IP exists
          // __ if so, kick out
          // for (let key in this.state.players) {
          this.state.players.forEach((value: Player, key: string) => {
            if (this.state.players[key].ip == newIP.address) {
              let bannedClient = this.clients.find((c: Client) => c.id === key)
              if (bannedClient) {
                bannedClient.send("banned")
                bannedClient.leave()
              }
              delete this.state.players[key]
            }
          })
        }
      } catch (err) {
        console.log(err)
        // Sentry.captureException(err)
      }
    })

    // __ Remove IP address from blacklist
    this.onMessage("whitelist", (client, payload) => {
      try {
        let newIP = new IP()
        newIP.address = payload.address
        const itemIndex = this.state.blacklist.findIndex(
          (ip: IP) => ip === newIP
        )
        this.state.blacklist.splice(itemIndex, 1)
      } catch (err) {
        console.log(err)
        // Sentry.captureException(err)
      }
    })

    // __ Move user to point
    this.onMessage("go", (client, message) => {
      // console.log('go recieved')
      try {
        // __ Round target point
        // __ Make sure target point is within world bounds
        let roundedX = clamp(
          Math.ceil(
            get(message, "x", this.state.players[client.sessionId].x) / 10
          ) * 10,
          0,
          4990
        )
        let roundedY = clamp(
          Math.ceil(
            get(message, "y", this.state.players[client.sessionId].y) / 10
          ) * 10,
          0,
          4990
        )
        let loResRoundedX = roundedX / 10
        let loResRoundedY = roundedY / 10
        // __ Round origin point
        // __ Make sure origin point is within world bounds
        let originX = clamp(
          Math.ceil(
            get(message, "originX", this.state.players[client.sessionId].x) / 10
          ) * 10,
          0,
          4990
        )
        let originY = clamp(
          Math.ceil(
            get(message, "originY", this.state.players[client.sessionId].y) / 10
          ) * 10,
          0,
          4990
        )
        let loResOriginX = originX / 10
        let loResOriginY = originY / 10
        // __ Set up pathfinding
        easystar.findPath(
          loResOriginX,
          loResOriginY,
          loResRoundedX,
          loResRoundedY,
          path => {
            if (path === null || path.length == 0) {
              client.send("illegalMove", "No path found")
            } else {
              let fullPath = new Path()
              path.forEach(wp => {
                fullPath.waypoints.push(
                  new Waypoint(wp.x * 10, wp.y * 10, mapMatrix[wp.y][wp.x])
                )
              })
              const SIMPLIFICATION_FACTOR = 1
              let finalPath = new Path()

              const processPath = (index = 0) => {
                const nextIndex =
                  index + SIMPLIFICATION_FACTOR >= fullPath.waypoints.length - 1
                    ? fullPath.waypoints.length - 1
                    : index + SIMPLIFICATION_FACTOR
                const prevIndex = index == 0 ? 0 : index - SIMPLIFICATION_FACTOR

                let currentWaypoint = new Waypoint(
                  fullPath.waypoints[index].x,
                  fullPath.waypoints[index].y,
                  fullPath.waypoints[index].area
                )
                // __ Calculate direction
                const delta_x =
                  currentWaypoint.x - fullPath.waypoints[prevIndex].x
                const delta_y =
                  fullPath.waypoints[prevIndex].y - currentWaypoint.y
                currentWaypoint.direction = calculateDirection(delta_x, delta_y)

                finalPath.waypoints.push(currentWaypoint)

                if (index == fullPath.waypoints.length - 1) {
                  let extendedPath = new Path()
                  for (let i = 0; i < finalPath.waypoints.length - 1; i++) {
                    extendedPath.waypoints.push(finalPath.waypoints[i])
                    for (let x = 1; x < 5; x++) {
                      let tempPoint = new Waypoint(
                        finalPath.waypoints[i].x,
                        finalPath.waypoints[i].y,
                        finalPath.waypoints[i].area,
                        finalPath.waypoints[i + 1].direction
                      )
                      if (finalPath.waypoints[i + 1].direction == "back") {
                        tempPoint.y = tempPoint.y - 2 * x
                      } else if (
                        finalPath.waypoints[i + 1].direction == "front"
                      ) {
                        tempPoint.y = tempPoint.y + 2 * x
                      } else if (
                        finalPath.waypoints[i + 1].direction == "right"
                      ) {
                        tempPoint.x = tempPoint.x + 2 * x
                      } else if (
                        finalPath.waypoints[i + 1].direction == "left"
                      ) {
                        tempPoint.x = tempPoint.x - 2 * x
                      }
                      extendedPath.waypoints.push(tempPoint)
                    }
                  }

                  this.state.players[client.sessionId].x = currentWaypoint.x
                  this.state.players[client.sessionId].y = currentWaypoint.y
                  this.state.players[client.sessionId].area = currentWaypoint.area
                  this.state.players[client.sessionId].path = extendedPath
                  this.state.players[client.sessionId].fullPath = fullPath

                  // console.dir(extendedPath.waypoints)

                  return
                } else {
                  processPath(nextIndex)
                }
              }

              if (fullPath.waypoints.length > 0) {
                processPath(0)
              } else {
                client.send("illegalMove", "Empty full path")
              }
            }
          }
        )
        // __ Calculate path
        easystar.calculate()
      } catch (err) {
        console.log(err)
        // Sentry.captureException(err)
      }
    })

    // __ Teleport user to point
    this.onMessage("teleport", (client, message) => {
      if (message.area) {
        let newX = 0
        let newY = 0
        let colorIndex = 0
        if (message.area == "green") colorIndex = 4
        else if (message.area == "blue") colorIndex = 5
        else if (message.area == "yellow") colorIndex = 2
        else if (message.area == "red") colorIndex = 3
        else if (message.area == "magenta") colorIndex = 6
        else if (message.area == "cyan") colorIndex = 7
        else if (message.area == "purple") colorIndex = 8
        else if (message.area == "teal") colorIndex = 9
        // __ Get random point until it is with in required color area
        while (true) {
          newX =
            Math.ceil((Math.floor(Math.random() * (3950 - 50 + 1)) + 50) / 10) *
            10
          newY =
            Math.ceil((Math.floor(Math.random() * (3950 - 50 + 1)) + 50) / 10) *
            10
          if (mapMatrix[newY / 10][newX / 10] == colorIndex) break
        }
        this.state.players[client.sessionId].area = colorIndex
        this.state.players[client.sessionId].path = new Path()
        this.state.players[client.sessionId].fullPath = new Path()
        this.state.players[client.sessionId].x = newX
        this.state.players[client.sessionId].y = newY
      }
    })

    // __ Add chat message
    this.onMessage("submitChatMessage", (client, payload) => {
      try {
        if (payload.text && payload.text.length > 0) {
          if (this.state.messages.length > MAX_STACK_HEIGHT) {
            this.state.messages.splice(0, 1)
          }
          let newMessage = new Message()
          newMessage.msgId = get(payload, "msgId", "No msgId")
          newMessage.text = payload.text.substring(0, MAX_CHATMESSAGE_LENGTH)
          newMessage.name = get(payload, "name", "No name")
          newMessage.username = get(payload, "username", "")
          newMessage.directed = get(payload, "directed", false)
          newMessage.directedTo = get(payload, "directedTo",'')
          newMessage.authenticated = get(payload, "authenticated",false)
          newMessage.uuid = get(payload, "uuid", "No UUID")
          newMessage.tint = get(payload, "tint", "No tint")
          newMessage.room = get(payload, "room", 2)
          newMessage.timestamp = Date.now()
          this.state.messages.push(newMessage)
          // Write to DB
          const messageToMongo = new MongoMessage(newMessage)
          messageToMongo.save((err) => {
            if (err) {
              console.error(err)
            }
          })
        }
      } catch (err) {
        console.log(err)
        // Sentry.captureException(err)
      }
    })

    // __ Remove chat message
    this.onMessage("removeChatMessage", (client, payload) => {
      console.dir(payload)
      let targetMessage = this.state.messages.find((m: Message) => m.msgId == payload.msgId)
      console.dir(targetMessage)
      try {
        let targetMessageIndex = this.state.messages.findIndex(
          (m: Message) => m == targetMessage
        )
        console.log(targetMessageIndex)
        if (isNumber(targetMessageIndex)) {
          this.state.messages.splice(targetMessageIndex, 1)
          // !!! TODO: MARK MESSAGE AS REMOVED IN DATABASE
          this.broadcast("nukeMessage", targetMessage.msgId);
        }
      } catch (err) {
        console.log(err)
        // Sentry.captureException(err)
      }
    })

    // __ Pick up case study
    // this.onMessage("pickUpCaseStudy", (client, payload) => {
    //   try {
    //     if(this.state.caseStudies[payload.uuid]) {
    //       this.state.caseStudies[payload.uuid].carriedBy = client.sessionId
    //       this.state.players[client.sessionId].carrying = payload.uuid
    //       // __ Age by one unit
    //       this.state.caseStudies[payload.uuid].age -= 1
    //     }
    //   } catch (err) {
    //     console.log(err)
    //     Sentry.captureException(err)
    //   }
    // })

    // __ Drop case study
    // this.onMessage("dropCaseStudy", (client, payload) => {
    //   try {
    //     if(this.state.caseStudies[payload.uuid]) {
    //       this.state.players[client.sessionId].carrying = ""
    //       if (this.state.caseStudies[payload.uuid].age == 0) {
    //         delete this.state.caseStudies[payload.uuid]
    //       } else {
    //         this.state.caseStudies[payload.uuid].x =
    //           this.state.players[client.sessionId].x + getRandomInt(-20, 20)
    //         this.state.caseStudies[payload.uuid].y =
    //           this.state.players[client.sessionId].y + getRandomInt(-20, 20)
    //         this.state.caseStudies[payload.uuid].carriedBy = ""
    //       }
    //     } else {
    //       console.log('!!! Case study does not exist')
    //     }
    //   } catch (err) {
    //     console.log(err)
    //     Sentry.captureException(err)
    //   }
    // })
  }

  // __ Authenticate user
  onAuth(client: Client, options: any, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // __ Check if IP is on blacklist
      if (
        !this.state.blacklist.find(
          (ip: IP) => ip.address == request.headers['x-real-ip']
        )
      ) {
        // __ Set IP
        options.ip = request.headers['x-real-ip'] || request.connection.remoteAddress || "6.6.6.6"
        // __ If user is accredited
        // if (options.sso && options.sig) {
        //   console.log("Authenticate accredited user")
        //   const hmac = crypto.createHmac("sha256", SSO_SECRET)
        //   const decoded_sso = decodeURIComponent(options.sso)
        //   hmac.update(decoded_sso)
        //   const hash = hmac.digest("hex")
        //   // __ Accredited authentication successful
        //   if (options.sig == hash) {
        //     const b = Buffer.from(options.sso, "base64")
        //     const inner_qstring = b.toString("utf8")
        //     const ret = querystring.parse(inner_qstring)
        //     sanityClient
        //       .fetch('*[_type == "participant" && username == $u][0]', {u: ret.username})
        //       .then(user => {
        //         console.dir(user)
        //         options.discourseName = ret.username || "no-user-name"
        //         options.name = ret.name || ret.username
        //         // __ Set selected avatar from CMS
        //         options.avatar = user.avatarLink._ref
        //         delete options.sso
        //         delete options.sig
        //         options.authenticated = true
        //         resolve(true);
        //       }).catch(err => {
        //         reject(err); // sanity load failed
        //       })
        //   } else {
        //     reject(); // discourse auth failed
        //   }
        // } else {
        resolve(true); 
        // }
      } else {
        console.log("BANNED")
        reject(); // on black list
      }
    })
  }

  // __ Join user
  onJoin(client: Client, options: any) {
    // __ Make exception for moderator dashboard user
    if (!options.moderator) {
      try {
        let startX = 0
        let startY = 0
        // __ Get point in start area
        while (true) {
          startX =
            Math.ceil((Math.floor(Math.random() * (3950 - 50 + 1)) + 50) / 10) *
            10
          startY =
            Math.ceil((Math.floor(Math.random() * (3950 - 50 + 1)) + 50) / 10) *
            10
          // Spawn all in green area
          if (mapMatrix[startY / 10][startX / 10] == 4) break
        }

        // let randomAdjective = sample(RANDOM_WORDS)
        // randomAdjective =
        //   randomAdjective.charAt(0).toUpperCase() + randomAdjective.slice(1)
        // const userName =
        //   (!get(options, "authenticated", false) && !get(options, "npc", false)
        //     ? randomAdjective + " "
        //     : "") +
        //   get(options, "name", "Undefined name").substring(
        //     0,
        //     MAX_USERNAME_LENGTH
        //   )

        const userName = get(options, "name", "Undefined name").substring(
            0,
            MAX_USERNAME_LENGTH
          )

        this.state.players[client.sessionId] = new Player()
        this.state.players[client.sessionId].authenticated =
          options.authenticated || false
        this.state.players[client.sessionId].npc = options.npc || false
        this.state.players[client.sessionId].tint = get(
          options,
          "tint",
          "0XFF0000"
        )
        this.state.players[client.sessionId].name = userName
        this.state.players[client.sessionId].slug = get(
          options,
          "slug",
          "no-slug"
        )
        this.state.players[client.sessionId].discourseName = get(
          options,
          "discourseName",
          "no-discourse-name"
        )
        this.state.players[client.sessionId].uuid = get(
          options,
          "uuid",
          "no-uuid"
        )
        this.state.players[client.sessionId].ip = get(options, "ip", "6.6.6.6")
        this.state.players[client.sessionId].avatar = get(
          options,
          "avatar",
          "Undefined avatar id"
        )
        this.state.players[client.sessionId].connected = true
        this.state.players[client.sessionId].x = startX
        this.state.players[client.sessionId].y = startY
        this.state.players[client.sessionId].area =
          mapMatrix[startY / 10][startX / 10]
      } catch (err) {
        console.log(err)
        // Sentry.captureException(err)
      }
    }
  }

  // __ Leave user
  async onLeave(client: Client, consented: boolean) {
    console.log('A PLAYER LEFT')
    delete this.state.players[client.sessionId]
  }

  // __ Dispose game room
  onDispose() {
    console.log("game room disposed")
  }
}
