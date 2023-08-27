import React, {useState} from 'react';
import Head from "next/head";
import {logEntry} from "@/components/CommonProps";
import LogWindow from "@/components/LogWindow";
import ChatBox from "@/components/ChatBox";
import axios from "axios";

const ChatBridge = (): JSX.Element => {

    const knownModels = ['gpt-3.5-turbo', 'gpt-4']
    const initialModel = knownModels[0];

    const [currentModel, setCurrentModel] = useState(initialModel)
    const [statusText, setStatusText] = useState([] as string[])
    const [queryText, setQueryText] = useState([] as string[])

    const updateQuery = (queryUpdate: string) => {
        setQueryText(currentQuery => [...currentQuery, logEntry(queryUpdate)]);
    }

    const updateStatus = (statusUpdate: string) => {
        setStatusText(currentStatus => [...currentStatus, logEntry(statusUpdate)]);
    }

    const submitQuery = (message: string) => {

        const queryPayload = {
            model: currentModel,
            message: message,
            key: new Date().toISOString(),
        }

        const headers = {
            headers: {
                'Content-Type': 'application/json'
            }
        }

        updateStatus(`${queryPayload.model}: ${queryPayload.message}`)
        const queryPayloadJson = JSON.stringify(queryPayload);
        axios.post(`/api/resolver`, queryPayloadJson, headers)
            .then((response) => {
                const answer = JSON.stringify(response.data);
                updateStatus(`answer received(${answer})`);
                updateQuery(JSON.parse(JSON.stringify(response.data.data)));
            })
            .catch((error) => updateStatus(`delivery failure: ${error}`));

    }

    const title = (text: string) => {
        return (
            <h1 className="p-2 text-2xl decoration-2 font-bold">{text}</h1>
        );
    }

    const title2 = (text: string) => {
        return (
            <h1 className="p-2 text-xl decoration-2 font-bold">{text}</h1>
        );
    }

    const textAreaClassName = `p-2 overflow-y-auto w-full min-h-full`
    const statusBoxClassName = `${textAreaClassName} h-12`
    const queryBoxClassName = `${textAreaClassName} h-24`
    const responseBoxClassName = `${textAreaClassName} h-36`

    return (
        <main className="flex items-center justify-around font-sans">
            <Head>
                <title>Chat Bridge</title>
            </Head>

            <div className="p-2 m-5 w-full shadow-2xl drop-shadow-lg space-y-3">
                <div className="border-2 border-black bg-blue-50">
                    {title("Status Updates")}
                    <LogWindow
                        loggerText={statusText}
                        loggerDescription="Consumer status updates"
                        textAreaClassName={statusBoxClassName}
                    />
                </div>
                <div className="border-2 border-black bg-blue-50">
                    {title("Chat Bridge")}
                    <div className="box-border border-dashed border-2">
                        <ChatBox
                            knownModels={knownModels}
                            model={currentModel}
                            textAreaClassName={queryBoxClassName}
                            onModel={model => {
                                setCurrentModel(model)
                                updateStatus(`model set to "${model}"`)
                            }}
                            onMessage={submitQuery}
                        />
                    </div>
                    <div className="box-border border-dashed border-2">
                        {title2("Response")}
                        <div>
                            <LogWindow
                                loggerText={queryText}
                                textAreaClassName={responseBoxClassName}
                                loggerDescription="Chat Response(s)"
                            />
                        </div>
                    </div>
                </div>
            </div>

        </main>
    );
};

export default ChatBridge;