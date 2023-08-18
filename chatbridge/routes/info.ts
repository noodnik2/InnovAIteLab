
export const SERVICENAME_CHATAPI = "chatapi";

export function getServiceAddr(serviceName: string): string {

    // console.log(`process.env:`)
    // Object.keys(process.env).forEach((prop, index, value)=> console.log(`${prop}=${value}`));

    let serviceAddr;
    switch(serviceName) {
        case SERVICENAME_CHATAPI:
            serviceAddr = process.env.NEXT_PUBLIC_OPENAI_CHATAPI_ADDR;
            break;
    }
    console.log(`for(${serviceName}) serviceAddr is(${serviceAddr})`)
    if (!serviceAddr) {
        throw `for(${serviceName}) serviceAddr is unknown`;
    }
    return serviceAddr;
};
