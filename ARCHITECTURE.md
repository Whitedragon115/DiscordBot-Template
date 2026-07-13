# Project architecture

This repository is a TypeScript Discord.js bot template with a small filesystem-based framework. Files and folder names are part of the runtime contract: the loaders discover commands, event handlers, and component triggers without a central registry.

## Runtime overview

```text
index.ts
  -> validate command filenames
  -> create MyClient and its command Collection
  -> discover top-level commands and root command folders
  -> discover component triggers
  -> attach every module from events/ and utils/ as a Discord event listener
  -> log in to Discord

Discord InteractionCreate
  -> interactionCommands.ts for slash commands and autocomplete
  -> interactionPage.ts for custom IDs beginning with page:<number>_
  -> interactionTrigger.ts for ordinary buttons and modal submissions
```

`utils/myClient.ts` defines the Discord client and gateway intents. `index.ts` is the composition root: it constructs this client, fills `client.commands`, attaches event listeners, installs process-level error logging, and calls `client.login()`.

Several files can listen to the same Discord event. Each listener must therefore check the interaction type or custom-ID pattern immediately and return when the event does not belong to it.

Development uses `tsx` so source modules are discovered as `.ts`. `npm run build`
emits the same folder structure as ESM `.js` modules under `dist/`; the loaders
derive the active extension at runtime, so command routing behaves identically
in both modes.

## Command framework

The first folder below `commands/` is a category, not part of the Discord slash-command path:

```text
commands/
  tools/                       category
    ping.ts                    /ping
    [server]/                  /server root command
      index.ts                 root schema and leaf dispatcher
      status.ts                /server status
      [member]/                subcommand group
        index.ts               group schema
        inspect.ts             /server member inspect
  admin/                       protected command category
    admin-ping.ts              /admin-ping
```

### Standalone commands

A direct `.ts` child of a category is a complete slash command. Its default export must contain:

- `data`: a `SlashCommandBuilder` whose name is globally unique.
- `execute(interaction, client)`: the command handler.
- `autocomplete(interaction, client)`: optional in practice, but required if the command defines autocomplete options.

At startup, `index.ts` imports the module and stores it in `client.commands` under `command.data.name`.

### Root commands and subcommands

A bracketed folder such as `[server]` represents one root slash command. Its `index.ts` owns the root `SlashCommandBuilder` and is the only module registered in `client.commands` at runtime.

Leaf files next to the root index use `SlashCommandSubcommandBuilder`. Their filename must equal `data.name`, because the root handler selects a leaf with `options.getSubcommand()` and dynamically imports `./<subcommand>.ts`.

A nested bracketed folder such as `[member]` represents a Discord subcommand group. Its `index.ts` owns a `SlashCommandSubcommandGroupBuilder`; leaf files inside it own `SlashCommandSubcommandBuilder` objects. Runtime dispatch becomes `./[<group>]/<subcommand>.ts`.

The root `index.ts` delegates both `execute` and `autocomplete` to the selected leaf. Business logic belongs in the leaf, while the root index should remain routing-only.

### Deployment versus execution

`npm run dp` runs `.script/deploy.ts`. This is the schema-building phase:

1. Standalone command builders are serialized directly.
2. For every bracketed root, leaf builders are added with `addSubcommand()`.
3. Nested group builders receive their leaves and are added with `addSubcommandGroup()`.
4. The completed schemas are registered as guild commands using `CLIENTID`, `GUILDID`, and `TOKEN`.

Normal bot startup does not rebuild or register the Discord command schemas. Run deployment after changing a command name, description, option, subcommand, or group structure. Handler-only changes only require restarting the bot.

At startup, `subCommandMismatchChecker()` imports non-index leaf files under bracketed folders and rejects files whose filename differs from `data.name`. This protects the dynamic-import convention.

## Events and component triggers

Every `.ts` file directly inside `events/` and `utils/` is treated as an event module with this shape:

```js
export default {
  name: Events.SomeEvent,
  once: false,
  async execute(...discordArguments, client) {}
};
```

Use `events/` for Discord lifecycle and interaction routing. Although `utils/chatCommand.ts` currently acts as a `MessageCreate` listener, new non-event helpers should not be placed in `utils/`, because the startup loader assumes every file there is an event module.

Files under `trigger/<category>/` handle component interactions. A trigger exports a unique `customId` and `execute(interaction, client)`. `interactionTrigger.ts` routes exact IDs. `interactionPage.ts` additionally recognizes IDs shaped like `page:<number>_<id>`, converts them to `page_<id>`, and calls the trigger with the parsed page number as a third argument.

## Supporting code

- `function/` contains shared stateless helpers for logging, JSON configuration, time, UUIDs, and size formatting.
- `config.tson` contains non-secret application configuration such as `AdminRoleId`.
- `.env` contains Discord credentials and IDs; `.env.example` documents required environment variables.
- `.script/newCmd.ts` and `.script/newTrigger.ts` are interactive scaffolding tools exposed as `npm run newcmd` and `npm run newtri`.
- `.script/zip.ts` and `.script/upload.ts` support packaging and upload workflows.
- `log/` contains generated error logs and should not contain application code.

## How to organize new code

Organize by feature at the interaction boundary and by responsibility below it:

1. Put each standalone slash command in `commands/<category>/<name>.ts`.
2. Use `commands/<category>/[<root>]/` only when several operations naturally share one Discord root command.
3. Keep root and group `index.ts` files declarative and routing-focused; put execution logic in leaf files.
4. Put button, modal, and select-menu handlers in `trigger/<component-type-or-feature>/` and keep every `customId` globally unique.
5. Put Discord event adapters in `events/`. They should validate, authorize, dispatch, and format interaction-level errors.
6. Put reusable domain or service logic outside command handlers, for example in `services/` or feature folders. That code should accept ordinary values and return ordinary results so it can be reused and tested without constructing Discord interactions.
7. Reserve `function/` (or rename it to `lib/`) for small, generic helpers. Avoid putting feature business logic there.
8. Use the provided generators for framework-shaped files so filenames and exports stay consistent.

A larger feature can follow this pattern:

```text
commands/moderation/[member]/ban.ts    Discord input and response
services/moderation/banMember.ts       permission-independent business operation
trigger/moderation/confirm-ban.ts      confirmation button adapter
```

## Current implementation cautions

- Admin slash-command authorization is inferred from the top-level category (`admin` or `admin-*`) and checked against `AdminRoleId`. The `admin` property assigned during startup is not the value used by the router.
- Trigger routers compute admin markers from filenames containing `[admin]`, but currently do not enforce them. Do not rely on that naming convention for security until an explicit role check is implemented.
- Trigger modules are imported and their maps rebuilt for every component interaction, even though startup also loads them into an unused `buttonActions` object. A future cleanup should build one trigger collection on the client at startup and let both routers reuse it.
- Command metadata is discovered twice: once in `index.ts` and again in `interactionCommands.ts`. A single startup registry would reduce duplicated imports and avoid divergent rules.
- The loader treats all direct files in `utils/` as event listeners. Place ordinary utility modules elsewhere or split the event-loading convention before adding them.
- `interactionTrigger.ts` currently accepts buttons and modal submissions, while the trigger generator also offers select menus. Select-menu triggers will not execute until the router includes the corresponding interaction type.
- Command, root-command, and trigger IDs must be globally unique because their registries are keyed only by `data.name` or `customId`; category folders do not namespace them.

## Contributor checklist

Before considering a new interaction complete:

- Confirm slash names use Discord's lowercase `1-32` character format.
- Confirm every subcommand leaf filename exactly matches `data.name`.
- Confirm root and group indexes contain builders, while leaf files contain behavior.
- Confirm command names and trigger custom IDs do not collide anywhere in the repository.
- Run `npm run dp` after schema changes, then restart the bot.
- Exercise execution and autocomplete paths separately when autocomplete is used.
- Verify permission checks in executable code rather than relying on folder or filename labels alone.

