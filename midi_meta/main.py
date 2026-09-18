# PATH="/Users/martyross/.local/bin:$PATH"

import json
import re
import os
import argparse
from typing import Dict, List, Any, Tuple, Optional
import logging

# Configure different LLM providers
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    from ollama import Client as OllamaClient
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class MidiMetadataExtractor:
    def __init__(self, model_type: str = "openai", model_name: str = "gpt-4") -> None:
        """
        Initialize the MIDI metadata extractor with the specified model.

        Args:
            model_type: Type of model to use ('openai' or 'ollama')
            model_name: Specific model name to use
        """
        self.model_type = model_type.lower()
        self.model_name = model_name
        self.client = self._setup_client()

    def _setup_client(self) -> Any:
        """Set up the appropriate LLM client based on configuration."""
        if self.model_type == "openai":
            if not OPENAI_AVAILABLE:
                raise ImportError("OpenAI package is not installed. Install with 'pip install openai'")
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is not set")
            return openai.OpenAI(api_key=api_key)

        elif self.model_type == "ollama":
            if not OLLAMA_AVAILABLE:
                raise ImportError("Ollama package is not installed. Install with 'pip install ollama'")
            return OllamaClient()

        else:
            raise ValueError(f"Unsupported model type: {self.model_type}")

    def _analyze_with_llm(self, metadata_tags: List[str]) -> Dict[str, Dict[str, str]]:
        """
        Analyze metadata tags using the configured LLM.

        Args:
            metadata_tags: List of metadata strings from the MIDI file

        Returns:
            Dictionary with extracted metadata fields and confidence scores
        """
        prompt = f"""
        Analyze these MIDI file metadata tags and extract the most likely values for:
        1. Artist name
        2. Song title
        3. Song genre
        4. Publication year
        5. Copyright information
        6. An interesting comment or note
        
        For each field, provide your best guess and a confidence percentage (a number between 0 and 1).
        
        Metadata tags:
        {json.dumps(metadata_tags, indent=2)}
        
        Return only a JSON object with this exact structure:
        {{
            "artist":     {{"text": "extracted artist",       "confidence": 0.0}},
            "title":      {{"text": "extracted title",        "confidence": 0.0}},
            "genre":      {{"text": "extracted genre",        "confidence": 0.0}},
            "year":       {{"text": "extracted year",         "confidence": 0.0}},
            "copyright":  {{"text": "extracted copyright",    "confidence": 0.0}},
            "comment":    {{"text": "extracted comment",      "confidence": 0.0}}
        }}
        """

        if self.model_type == "openai":
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1
            )
            result_text = response.choices[0].message.content

        elif self.model_type == "ollama":
            response = self.client.generate(model=self.model_name, prompt=prompt)
            result_text = response['response']

        else:
            raise ValueError(f"Unsupported model type: {self.model_type}")

        # Extract JSON from the response
        try:
            # Find JSON object in the response (in case there's extra text)
            json_match = re.search(r'({.*})', result_text.replace('\n', ' '), re.DOTALL)
            if json_match:
                result_text = json_match.group(1)

            result = json.loads(result_text)
            return result
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.debug(f"Raw response: {result_text}")
            # Return a default structure with low confidence
            return {
                "artist":       {"text": "Unknown",     "confidence": 0.0},
                "title":        {"text": "Unknown",     "confidence": 0.0},
                "genre":        {"text": "Unknown",     "confidence": 0.0},
                "year":         {"text": "Unknown",     "confidence": 0.0},
                "copyright":    {"text": "Unknown",     "confidence": 0.0},
                "comment":      {"text": "Unknown",     "confidence": 0.0}
            }

    def _clean_metadata_text(self, text: str) -> str:
        """
        Clean up metadata text by removing null bytes and other problematic characters.

        Args:
            text: Raw metadata text

        Returns:
            Cleaned metadata text
        """
        # Remove null bytes
        text = text.replace('\\x00', '')

        # Remove common escape sequences
        for esc in ['\\xc9', '\\xcd', '\\xba', '\\xc8']:
            text = text.replace(esc, '')

        # Remove leading/trailing whitespace
        text = text.strip()

        return text

    def _extract_tag_values(self, metadata_tags: List[str]) -> List[str]:
        """
        Extract actual values from metadata tags, cleaning them in the process.

        Args:
            metadata_tags: List of raw metadata tag strings

        Returns:
            List of cleaned tag values
        """
        values = []
        for tag in metadata_tags:
            # Extract text content from tags
            match = re.search(r'text: "(.*?)"', tag)
            if match:
                value = match.group(1)
                cleaned_value = self._clean_metadata_text(value)
                if cleaned_value:
                    values.append(cleaned_value)
        return values

    def process_midi_metadata(self, input_file: str, output_file: str) -> None:
        """
        Process MIDI metadata from an input JSON file and write results to an output file.

        Args:
            input_file: Path to the input JSON file
            output_file: Path to write the output JSON file
        """
        try:
            with open(input_file, 'r') as f:
                midi_data = json.load(f)

            results = {}
            total_files = len(midi_data)

            for i, (filename, metadata_tags) in enumerate(midi_data.items(), 1):
                logger.info(f"Processing file {i}/{total_files}: {filename}")

                # Clean and extract the tag values
                cleaned_tags = self._extract_tag_values(metadata_tags)

                # Analyze with LLM
                metadata_results = self._analyze_with_llm(metadata_tags)

                # Store results for this file
                results[filename] = metadata_results

            # Write results to output file
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2)

            logger.info(f"Results written to {output_file}")

        except Exception as e:
            logger.error(f"Error processing MIDI metadata: {e}")
            raise


def main():
    parser = argparse.ArgumentParser(description='Extract metadata from MIDI files')
    parser.add_argument('input_file', help='Path to the input JSON file containing MIDI metadata tags')
    parser.add_argument('output_file', help='Path to write the output JSON file')
    parser.add_argument('--model-type', default='openai', choices=['openai', 'ollama'],
                        help='Type of LLM to use (default: openai)')
    parser.add_argument('--model-name', default='gpt-4',
                        help='Name of the specific model to use (default: gpt-4)')

    args = parser.parse_args()

    # Create and run the extractor
    extractor = MidiMetadataExtractor(model_type=args.model_type, model_name=args.model_name)
    extractor.process_midi_metadata(args.input_file, args.output_file)


if __name__ == "__main__":
    main()