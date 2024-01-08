# Google Gemini

## Testing an API Key

```shell
$ curl \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"What comes to mind when I tell you my userid is noodnik2?"}]}]}' \
  -X POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY
```

Gemini's answer to the question above was:

> 1. Intelligence and Knowledge: 
> - Noodnik is a Yiddish term that refers to a know-it-all or a nag. However, when combined with the number 2, it may imply a knowledgeable and intelligent individual.
> 2. Jewish Heritage: 
> - The term \"noodnik\" is derived from Yiddish, and its use in an online username suggests the user may have a Jewish background or an interest in Jewish culture.
> 3. Playfulness and Wit: 
> - Combining \"noodnik\" with the number 2 creates a playful and humorous username. It suggests that the person behind it can be witty and may enjoy poking fun at themselves or engaging in banter.
> 4. Love of Language: 
> - Choosing \"noodnik2\" as a username indicates that the person appreciates language and enjoys using unique or less common words. It demonstrates their comfort with expressing themselves through language in creative ways.
> 5. Interest in Internet Culture: 
> - Using a username that combines a quirky word and a number is a common trend in online communities. It suggests that the individual is familiar with and participates in online culture, enjoying its quirks and playful nature.
> 6. Privacy and Anonymity: 
> - Opting for a username that is not immediately identifiable can serve as a way to maintain privacy and anonymity online. It allows the user to engage in discussions and activities without revealing personal information.
> 7. Gender and Identity: 
> - The username \"noodnik2\" does not provide clear indications regarding the gender or identity of the user. This could be intentional, as the individual may prefer to keep their online persona ambiguous or gender-neutral.

## Development Workflow

### Authentication

See how to authenticate by [providing credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc).

```shell
$ gcloud auth application-default login
```