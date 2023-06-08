# `oatscli` - OpenAI API Typescript CLI

CLI "playground" for invoking OpenAPI API functionality using Typescript

## Steps to Create

```shell
$ npm init -y
$ npm install typescript --save-dev
$ npm install @types/node --save-dev
$ npx tsc --init --rootDir src --outDir bin \
  --target es2017 --module esnext --moduleResolution node \
  --esModuleInterop --resolveJsonModule --lib es6 \
  --allowJs true --noImplicitAny true
$ mkdir src
$ : create the program
$ vi src/index.ts
$ : change 'type' to 'module' to allow ESM modules for 'import' syntax, set command name, author, etc.
$ vi package.json
```

## Workflow

Once everything is in place as per above, multiple passes of developing and
installing the CLI into the classpath go something like as follows:

```shell
$ : edit the source; e.g.
$ vi src/index.ts
$ : compile the changes into Javascript
$ npx tsc
$ : publish the result as a CLI command in the classpath
$ npm install -g .
$ : check that the CLI is now found in the classpath
$ which oatscli
~/.nvm/versions/node/v18.15.0/bin/oatscli
```

## Invocation

After installation, the CLI can be invoked directly; e.g.:

```shell
$ ../bin/envrun oatscli | jq .
{
  "id": "cmpl-78txaV5LCwYhRCD7X7296BXg1hPMy",
  "object": "text_completion",
  "created": 1682356090,
  "model": "text-davinci-003",
  "choices": [
    {
      "text": " Quels sont les chambres disponibles ? Les toilettes sont-elles propres ?\n2. ¿Qué habitaciones tienen disponibles? ¿Están limpios los baños?",
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 32,
    "completion_tokens": 51,
    "total_tokens": 83
  }
}
```

## References
- [openai-node](https://github.com/openai/openai-node)
- [OpenAI API](https://platform.openai.com/docs/api-reference?lang=node.js)
