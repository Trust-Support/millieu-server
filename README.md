# 🌳 Millieu (frontend)

Millieu is an customisable open-source interface that enables users to turn conferences, online communities or group chats into explorable social worlds.

## Millieu components

+ [Frontend](https://github.com/pwrstudio/millieu.org)
+ [Server](https://github.com/pwrstudio/millieu-server)
+ [Moderator dashboard](https://github.com/pwrstudio/millieu-moderator)
+ [Discourse bridge](https://github.com/pwrstudio/millieu-discourse-bridge)
+ [Graphics processor](https://github.com/pwrstudio/millieu-graphics-processor)
+ [Sanity CMS](https://github.com/pwrstudio/millieu-sanity-admin)

## Usage

```
npm init colyseus-app
```

## Structure

- `index.ts`: main entry point, register an empty room handler and attach [`@colyseus/monitor`](https://github.com/colyseus/colyseus-monitor)
- `MyRoom.ts`: an empty room handler for you to implement your logic
- `loadtest/example.ts`: scriptable client for the loadtest tool (see `npm run loadtest`)
- `package.json`:
    - `scripts`:
        - `npm start`: runs `ts-node index.ts`
        - `npm run loadtest`: runs the [`@colyseus/loadtest`](https://github.com/colyseus/colyseus-loadtest/) tool for testing the connection, using the `loadtest/example.ts` script.
    - `dependencies`:
        - `colyseus`
        - `@colyseus/monitor`
        - `express`
    - `devDependencies`
        - `ts-node`
        - `typescript`
        - `@colyseus/loadtest`
- `tsconfig.json`: TypeScript configuration file


## License

MIT
