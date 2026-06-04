// @ts-nocheck

import { OpenCode } from "@interbase/core"
import { ReadTool } from "@interbase/core/tools"

const interbase = OpenCode.make({})

interbase.tool.add(ReadTool)

interbase.tool.add({
  name: "bash",
  schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to run.",
      },
    },
    required: ["command"],
  },
  execute(input, ctx) {},
})

interbase.auth.add({
  provider: "openai",
  type: "api",
  value: process.env.OPENAI_API_KEY,
})

interbase.agent.add({
  name: "build",
  permissions: [],
  model: {
    id: "gpt-5-5",
    provider: "openai",
    variant: "xhigh",
  },
})

const sessionID = await interbase.session.create({
  agent: "build",
})

interbase.subscribe((event) => {
  console.log(event)
})

await interbase.session.prompt({
  sessionID,
  text: "hey what is up",
})

await interbase.session.prompt({
  sessionID,
  text: "what is up with this",
  files: [
    {
      mime: "image/png",
      uri: "data:image/png;base64,xxxx",
    },
  ],
})

await interbase.session.wait()

console.log(await interbase.session.messages(sessionID))
