package main

import (
	"context"
	"errors"
	"fmt"

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

	ctx := context.Background()

	// Access your API key as an environment variable (see "Set up your API key" above)
	gc, gcErr := genai.NewClient(ctx, option.WithAPIKey(cfg.Gemini.ApiKey))
	if gcErr != nil {
		panic(gcErr)
	}
	defer func() { _ = gc.Close() }()

	// For text-and-image input (multimodal), use the gemini-pro-vision model
	// For text-only input, use the gemini-pro model
	model := gc.GenerativeModel("gemini-pro")

	prompt := genai.Text("Tell me who you are in no more than 5 sentences.")
	cs := model.StartChat()
	iter := cs.SendMessageStream(ctx, prompt)

	for {
		resp, errNext := iter.Next()
		if errors.Is(errNext, iterator.Done) {
			break
		}
		if errNext != nil {
			panic(errNext)
		}

		for _, candidate := range resp.Candidates {
			for _, part := range candidate.Content.Parts {
				fmt.Printf("%s", part) //nolint:forbidigo
			}
		}
	}

	fmt.Println() //nolint:forbidigo
}
