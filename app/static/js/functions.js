import {encryptionManager} from "./encryption.js";
import {saveKey, getPrivateKey} from "./indexeddb.js";


export async function getConnectionID(recipientID) {
    //Gets connection ID and returns as a JSON response
    const connectionResponse = await fetch(`/get-connection-id/${recipientID}`);
    const connectionData = await connectionResponse.json();
    return connectionData[0];
};

export async function getSessionID(conversationID) {
    //Gets session ID and returns as a JSON response
    const sessionResponse = await fetch(`/get-latest-session-id/${conversationID}`)
    const sessionData = await sessionResponse.json()
    return sessionData[0]
};

export async function getConversationID(connectionID) {
    //Gets conversation ID and returns as a JSON response
    const conversationResponse = await fetch(`/get-conversation-id/${connectionID}`);
    const conversationData = await conversationResponse.json();
    return conversationData[0];
};

export async function getSenderID() {
    //Gets sender ID and returns as a JSON response
    const idResponse = await fetch(`get-sender-id`);
    const senderID = await idResponse.json();
    return senderID
};

export async function getEncryptedAESKeys(sessionID) {
    //Gets base64 encrypted AES keys and returns as a JSON response
    const idResponse = await fetch(`get-encrypted-AES-key/${sessionID}`);
    const base64EncryptedAESKeys = await idResponse.json();
    return base64EncryptedAESKeys
};

export async function decryptBase64Key(senderID, base64EncryptedAESKey) {

    //Gets RSA Private key from IndexedDB Database
    const RSAPrivateKey = await getPrivateKey(senderID);
    const encryptedAESKey = await Base64toArrayBuffer(base64EncryptedAESKey);
    const AESKey = await encryptionManager.decryptAESKey(encryptedAESKey.buffer, RSAPrivateKey);
    return AESKey;
};

export async function arrayBuffertoBase64(arrayBuffer) {
    //https://stackoverflow.com/questions/9267899/arraybuffer-to-base64-encoded-string
    const base64String = btoa([].reduce.call(new Uint8Array(arrayBuffer),function(p,c){return p+String.fromCharCode(c)},''));
    return base64String;
};

export async function Base64toArrayBuffer(base64String) {
    
    const plaintext = atob(base64String)

    //https://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
    //Converts plaintext into 8 bit array of bytes in order to output PDF files correctly
    const bytes = new Uint8Array(plaintext.length);
    for (let i = 0; i < plaintext.length; i++) {
        bytes[i] = plaintext.charCodeAt(i);
    }

    return bytes;
};

export function insertChatMessage(message, chatMessages) {

    //If pre-existing messages, inserts message at start of HTML code, else pushes message to HTML
    //Ensures files are not in reverse-order
    if (chatMessages.firstChild) {
        chatMessages.insertBefore(message, chatMessages.firstChild);
    }
    else {
        chatMessages.appendChild(message, chatMessages.firstChild);
    }
};

export async function appendMessage(message, senderID, chatMessages, AESKey) {


    const bufferContent = await Base64toArrayBuffer(message.content);
    const bufferIV = await Base64toArrayBuffer(message.IV);

    const data = await encryptionManager.decryptData(bufferContent.buffer, AESKey, bufferIV);

    message.content = data;

    if (message.senderID == senderID) {
        const senderMessage = document.createElement("div");
        senderMessage.className = "sender-message";
        senderMessage.textContent = message.content;

        insertChatMessage(senderMessage, chatMessages);
    }

    else if (message.recipientID == senderID) {
        const recipientMessage = document.createElement("div");
        recipientMessage.className = "recipient-message";
        recipientMessage.textContent = message.content;

        insertChatMessage(recipientMessage, chatMessages);
    }
};

export async function appendFile(file, senderID, chatMessages, AESKey) {

    const bufferContent = await Base64toArrayBuffer(file.content);
    const bufferIV = await Base64toArrayBuffer(file.IV);

    const data = await encryptionManager.decryptData(bufferContent.buffer, AESKey, bufferIV);

    file.content = data;

    //Splits file path from path to file on server to file name user originally proposed, e.g. 'image.png'
    const filePath = file.filePath
    const fileName = (filePath.split("%"))[1];

    const plaintext = file.content

    //Converts plaintext to array buffer
    const textEncoder = new TextEncoder();
    console.log('after', plaintext)
    const bytes = textEncoder.encode(plaintext).buffer

    let blob;

    //Assigns plaintext or bytes to blob depending on file format
    if (file.dataFormat == "text/plain") {
        blob = new Blob([plaintext], {type: "text/plain"});
    } else if (file.dataFormat == "application/pdf") {
        blob = new Blob([bytes], {type: "application/pdf"});
    }   

    console.log('blob', blob)
    
    if (file.senderID == senderID) {

        const senderLink = document.createElement("a");
    
        senderLink.className = "sender-message"
        senderLink.href = window.URL.createObjectURL(blob);
        senderLink.download = fileName;
        senderLink.textContent = fileName;

        insertChatMessage(senderLink, chatMessages)

    } else if (file.recipientID == senderID) {

        const recipientLink = document.createElement("a");
    
        recipientLink.className = "recipient-message"
        recipientLink.href = window.URL.createObjectURL(blob);
        recipientLink.download = fileName;
        recipientLink.textContent = fileName;

        insertChatMessage(recipientLink, chatMessages)
    }

};

export async function appendImage(file, senderID, chatMessages, AESKey) {

    const bufferContent = await Base64toArrayBuffer(file.content);
    const bufferIV = await Base64toArrayBuffer(file.IV);
    
    const data = await encryptionManager.decryptImage(bufferContent.buffer, AESKey, bufferIV);

    const base64Data = await arrayBuffertoBase64(data);

    file.content = base64Data;

    //Assigns correct URL format to output images to HTML in base64
    const dataURL = `data:${file.dataFormat};base64,${file.content}`

    if (file.senderID == senderID) {
        const senderImage = document.createElement("img");
        senderImage.className = "sender-file";
        senderImage.src = dataURL;

        insertChatMessage(senderImage, chatMessages);
    
    } else if (file.recipientID == senderID) {
        const recipientImage = document.createElement("img");
        recipientImage.className = "recipient-file";
        recipientImage.src = dataURL;

        insertChatMessage(recipientImage, chatMessages);
    }
};
