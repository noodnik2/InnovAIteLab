# `gochat` [Gemini](https://deepmind.google/technologies/gemini)

Simple AI "chat" shell using [Google Gemini SDK](https://github.com/google/generative-ai-go).

## Configuration

Enter your API key in the `config-local.yaml` file before running.

## Running

In a `go` (version `1.21` or later) environment, run the app using the `Makefile` target, e.g.:

```shell
$ make run-chat
go run cmd/chat/main.go
Using model: gemini-pro
Type 'exit' to quit
Ask me anything: 
> Tell me in three words who you are.
Helpful Language Model
> exit
Goodbye!
Bye bye!
$ 
```

## See Also

The sibling project `gochat` for `Openai`.