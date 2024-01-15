# `gochat` [OpenAI](https://platform.openai.com/docs)

Simple AI "chat" shell using [Go OpenAI SDK](https://github.com/sashabaranov/go-openai).

## Configuration 

Enter your API key in the `config-local.yaml` file before running.

## Running

In a `go` (version `1.21` or later) environment, run the app using the `Makefile` target, e.g.:

```shell
$ make run-chat
go run cmd/chat/main.go
Using model: gpt-4-1106-preview
Type 'exit' to quit
Ask me anything: 
> Tell me in three words who you are.
Artificial Intelligence Assistant
> exit
Goodbye!
Bye bye!
$ 
```

## See Also

The sibling project `gochat` for Google `Gemini`.