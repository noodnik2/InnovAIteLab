package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
)

func generateEmbedding(apiKey, text string) ([]float64, error) {
	url := "https://api.openai.com/v1/embeddings"

	data := map[string]any{
		"input": text,
		"model": "text-embedding-ada-002",
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result map[string]any
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	if embeddingError := result["error"]; embeddingError != nil {
		return nil, fmt.Errorf("oops(%v)", embeddingError)
	}

	embeddingData := result["data"].([]any)[0].(map[string]any)["embedding"].([]any)
	embedding := make([]float64, len(embeddingData))
	for i, v := range embeddingData {
		embedding[i] = v.(float64)
	}

	return embedding, nil
}

func storeEmbedding(chromaURL string, embedding []float64, id string) error {
	embeddingData := map[string]any{
		"id":        id,
		"embedding": embedding,
	}

	jsonData, err := json.Marshal(embeddingData)
	if err != nil {
		return err
	}

	resp, err := http.Post(chromaURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return fmt.Errorf("failed to store embedding: %s", body)
	}

	return nil
}

func querySimilarEmbeddings(chromaURL string, queryEmbedding []float64) ([]map[string]any, error) {
	queryData := map[string]any{
		"embedding": queryEmbedding,
	}

	jsonData, err := json.Marshal(queryData)
	if err != nil {
		return nil, err
	}

	resp, err := http.Post(chromaURL+"/search", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result []map[string]any
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return result, nil
}

func main() {
	apiKey := "your-openai-api-key"
	chromaURL := "http://your-chroma-instance-url/embeddings"
	text := "Your text data here"
	id := "unique-id-for-your-data"

	// Generate embedding
	embedding, err := generateEmbedding(apiKey, text)
	if err != nil {
		fmt.Printf("Error generating embedding: %v\n", err)
		return
	}

	// Store embedding in Chroma
	err = storeEmbedding(chromaURL, embedding, id)
	if err != nil {
		fmt.Printf("Error storing embedding: %v\n", err)
		return
	}

	// Query similar embeddings
	results, err := querySimilarEmbeddings(chromaURL, embedding)
	if err != nil {
		fmt.Printf("Error querying similar embeddings: %v\n", err)
		return
	}

	fmt.Printf("Similar embeddings: %v\n", results)
}
