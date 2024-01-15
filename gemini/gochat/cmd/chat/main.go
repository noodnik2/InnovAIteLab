package main

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"os"

	"github.com/google/generative-ai-go/genai"
	"github.com/noodnik2/InnovAteLab/gemini/gochat/config"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

func main() {
	cfg, cfgErr := config.Load()
	if cfgErr != nil {
		panic(cfgErr)
	}

	c, chiErr := newChatter(cfg.Gemini)
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

func newChatter(gcfg config.Gemini) (*chatter, error) {
	ctx := context.Background()
	gc, gcErr := genai.NewClient(ctx, option.WithAPIKey(gcfg.ApiKey))
	if gcErr != nil {
		return nil, nil
	}

	cs := gc.GenerativeModel(gcfg.Model).StartChat()

	return &chatter{ctx: ctx, gc: gc, cs: cs, model: gcfg.Model}, nil
}

type chatter struct {
	gc  *genai.Client
	cs  *genai.ChatSession
	model string
	ctx context.Context
}

func (c *chatter) Close() error {
	return c.gc.Close()
}

func (c *chatter) makeSynchronousTextQuery(input string) error {
	iter := c.cs.SendMessageStream(c.ctx, genai.Text(input))

	for {
		resp, errNext := iter.Next()
		if errors.Is(errNext, iterator.Done) {
			break
		}
		if errNext != nil {
			return errNext
		}

		for _, candidate := range resp.Candidates {
			for _, part := range candidate.Content.Parts {
				fmt.Printf("%s", part)
			}
		}
	}

	fmt.Println()
	return nil
}
