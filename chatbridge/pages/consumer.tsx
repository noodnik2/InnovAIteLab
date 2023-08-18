import React, {useState} from 'react';
import Head from "next/head";
import {logEntry} from "@/components/CommonProps";
import LogWindow from "@/components/LogWindow";
import MessageProducer from "@/components/MessageProducer";
import MessageConsumer from "@/components/MessageConsumer";
import axios from "axios";

const Consumer = (): JSX.Element => {

    const knownModels = ['gpt-4', 'gpt-3.5-turbo']
    const initialModel = 'gpt-4';

    const [currentModel, setCurrentModel] = useState(initialModel)
    const [statusText, setStatusText] = useState([] as string[])
    const [messageText, setMessageText] = useState([] as string[])

    const updateMessage = (messageUpdate: string) => {
        setMessageText(currentMessage => [...currentMessage, logEntry(messageUpdate)]);
    }

    const updateStatus = (statusUpdate: string) => {
        setStatusText(currentStatus => [...currentStatus, logEntry(statusUpdate)]);
    }

    const submitQuery = (message: string) => {

        const payload = {
            model: currentModel,
            message: message,
            key: new Date().toISOString(),
        }

        const headers = {
            headers: {
                'Content-Type': 'application/json'
            }
        }

        updateStatus(`${payload.model}: ${payload.message}`)
        const jsonPayload = JSON.stringify(payload);
        axios.post(`/api/outbox`, jsonPayload, headers)
            .then((response) => {
                const answer = JSON.stringify(response.data);
                updateStatus(`answer received(${answer})`);
                updateMessage(JSON.parse(JSON.stringify(response.data.data)));
            })
            .catch((error) => updateStatus(`delivery failure: ${error}`));

    }

    const title = (text: string) => {
        return (
            <h1 className="p-2 text-2xl decoration-2 font-bold">{text}</h1>
        );
    }

    const textAreaClassName = "p-2 overflow-y-auto w-full h-24 min-h-full"

    return (
        <main className="flex items-center justify-around font-sans">
            <Head>
                <title>Consumer</title>
            </Head>

            <div className="p-2 m-5 w-full shadow-2xl drop-shadow-lg space-y-3">
                <div className="border-2 border-black bg-blue-50">
                    {title("Status Updates")}
                    <LogWindow
                        loggerText={statusText}
                        loggerDescription="Consumer status updates"
                        textAreaClassName={textAreaClassName}
                    />
                </div>
                <div className="border-2 border-black bg-blue-50">
                    {title("Chat")}
                    <div className="box-border border-dashed border-2">
                        <MessageProducer
                            knownModels={knownModels}
                            model={currentModel}
                            textAreaClassName={textAreaClassName}
                            onModel={model => {
                                setCurrentModel(model)
                                updateStatus(`model set to "${model}"`)
                            }}
                            onMessage={submitQuery}
                        />
                    </div>
                    <div className="box-border border-dashed border-2">
                        <MessageConsumer
                            textAreaClassName={textAreaClassName}
                            consumerText={messageText}
                        />
                    </div>
                </div>
            </div>

        </main>
    );
};

export default Consumer;