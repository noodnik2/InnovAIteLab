package main

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os"

	"github.com/noodnik2/InnovAteLab/gemini/gochat/config"
	"github.com/sashabaranov/go-openai"
)

// see: https://github.com/sashabaranov/go-openai

func main() {
	cfg, cfgErr := config.Load()
	if cfgErr != nil {
		panic(cfgErr)
	}

	c, chiErr := newChatter(cfg.Openai)
	if chiErr != nil {
		panic(chiErr)
	}

	defer func() { _ = c.Close() }()
	s := bufio.NewScanner(os.Stdin)

	fmt.Printf("Using model: %s\n", c.model)
	fmt.Println("Type 'exit' to quit")
	fmt.Println("Ask me anything: ")
	for {
		fmt.Print("> ")
		s.Scan()
		input := s.Text()

		if input == "exit" {
			fmt.Println("Goodbye!")
			break
		}

		if tqErr := c.makeSynchronousTextQuery(input); tqErr != nil {
			panic(tqErr)
		}
	}

	fmt.Println("Bye bye!")
}

func newChatter(ccfg config.Openai) (*chatter, error) {
	ctx := context.Background()
	client := openai.NewClient(ccfg.ApiKey)
	return &chatter{ctx: ctx, client: client, model: ccfg.Model}, nil
}

type chatter struct {
	ctx    context.Context
	client *openai.Client
	model  string
	dialog []openai.ChatCompletionMessage
}

func (c *chatter) Close() error {
	return nil
}

func (c *chatter) makeSynchronousTextQuery(input string) error {

	message := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: input,
	}

	c.dialog = append(c.dialog, message)

	resp, errCc := c.client.CreateChatCompletionStream(
		c.ctx,
		openai.ChatCompletionRequest{
			Model:    c.model,
			Messages: c.dialog,
		},
	)
	if errCc != nil {
		return errCc
	}

	var responseText string
	for {
		response, errRecv := resp.Recv()
		if errRecv != nil {
			if !errors.Is(errRecv, io.EOF) {
				return errRecv
			}
			break
		}
		responseChunk := response.Choices[0].Delta.Content
		responseText += responseChunk
		fmt.Print(responseChunk)
	}

	c.dialog = append(c.dialog, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleAssistant,
		Content: responseText,
	})

	fmt.Println()
	return nil
}
