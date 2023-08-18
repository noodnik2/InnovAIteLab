
export interface TextAreaProps {
    textAreaClassName?: string
}

/**
 * @param message a textual message intended to represent as a log entry
 * @returns the message as a log entry, prefixed with the current localized timestamp
 */
export const logEntry = (message: string) => {
    const now = new Date()
    const tzoffset = now.getTimezoneOffset() * 60000; //offset in milliseconds
    const localLogTimestamp = (new Date(now.getTime() - tzoffset)).toISOString().slice(0, -1)
    return `${localLogTimestamp} ${message}`
}

export interface Option {
    readonly label: string;
    readonly value: string;
}

export const createOption = (label: string) => ({
    label,
    value: label.toLowerCase().replace(/\W/g, ''),
});
