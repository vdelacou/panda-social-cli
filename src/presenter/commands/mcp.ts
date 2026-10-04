import type { CommandSpec } from '../command-spec.ts';

// The text is in Simplified Technical English (D49).
export const MCP: CommandSpec = {
  name: 'mcp',
  summary: 'Give the commands to an MCP client, for example Claude Desktop, through stdin and stdout.',
  description:
    'Starts an MCP server on stdio with five tools, for clients that have no shell: list-commands, get-command-docs, get-setup-guide, run-command and run-write-command. run-command runs the commands that do not publish or delete (status), and run-write-command runs post, update and delete. A token must not go through a chat, thus the setup that saves a token stays in the terminal, and get-setup-guide gives only the steps. To add the server to Claude Code, run `claude mcp add --transport stdio --scope user panda-social -- panda-social mcp`. To add it to Claude Desktop, put `"panda-social": {"command": "panda-social", "args": ["mcp"]}` in `mcpServers` of `claude_desktop_config.json`.',
  arguments: [],
  options: [],
  examples: [{ argv: ['mcp'], explanation: 'Start the server. An MCP client starts this command, not a person.' }],
  output:
    'No JSON line: until the client closes stdin, stdout contains only the JSON-RPC messages of the MCP protocol. Each run tool gives the JSON line that the CLI prints for the same command.',
  mutates: false,
  errors: ['unknown-option', 'unexpected-argument', 'wrong-tool'],
};
