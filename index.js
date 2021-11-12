const fs = require('fs');
const { Transform } = require('stream')
const file = 'cat_original.bmp'
const outputFile = 'cat_msg.bmp'
const messageBreak = '.'

const bytesToInt = bytes => {
    let result = 0
    result = result | (0xFF000000 & parseInt(bytes[3]) << 24)
    result = result | (0x00FF0000 & parseInt(bytes[2]) << 16)
    result = result | (0x0000FF00 & parseInt(bytes[1]) << 8)
    result = result | (0x000000FF & parseInt(bytes[0]) << 0)
    return result
}

const strToBin = (text) => {
    return text
        .split('')
        .map( letter => {
            return letter.charCodeAt(0).toString(2).padStart(8, '0')
        })
        .reduce((previous, current) => {
            return previous + current
        }, '')
}
const binToStr = (sequence) => {
    let text = ''
    for(let i=0; i < sequence.length; i+=8){
        text += String.fromCharCode(parseInt(sequence.substring(i, i+8), 2))
    }
    return text
}

const hideMessage = message => new Transform({
    transform: function(chunk, encoding, callback){
        const data = chunk
        if(!this.offset){
            this.offset = 0
        }

        // if it is the first chunk
        if(this.offset === 0){
            const id = (String.fromCharCode(data[0], data[1]))
            if(id === 'BM'){
                console.log('Image é Bitmap')
            }
            const tamanho = bytesToInt([
                data[2],
                data[3],
                data[4],
                data[5]
            ])
            console.log('Bitmap size: ', tamanho)
            const dataOffset = bytesToInt([
                data[10],
                data[11],
                data[12],
                data[13]
            ])
            this.dataOffset = dataOffset
            console.log('data', dataOffset)
            const usableBytes = tamanho - bytesToInt([
                data[10],
                data[11],
                data[12],
                data[13]
            ])

            const messageBin = strToBin(message + messageBreak)
            if(messageBin.length < usableBytes){
                console.log('É possivel ocultar uma mensagem')
            }else{
                console.log('Mensagem muito grande para esta imagem')
            }
            console.log('usable bytes', usableBytes)

            messageBin
                .split('')
                .forEach(bit => {
                    chunk[this.dataOffset] -= chunk[this.dataOffset]%2
                    chunk[this.dataOffset] += parseInt(bit)
                    this.dataOffset++
                })
        }
        this.push(chunk)
        this.offset += chunk.length
        callback()
    }
})
const showMessage = () => new Transform({
    transform: function(chunk, encoding, callback){
        const data = chunk
        if(!this.offset){
            this.offset = 0
        }

        // if it is the first chunk
        if(this.offset === 0){
            const id = (String.fromCharCode(data[0], data[1]))
            if(id === 'BM'){
                console.log('Imagem Bitmap')
            }
            const tamanho = bytesToInt([
                data[2],
                data[3],
                data[4],
                data[5]
            ])
            console.log('Tamanho bitmap: ', tamanho)
            const dataOffset = bytesToInt([
                data[10],
                data[11],
                data[12],
                data[13]
            ])
            this.dataOffset = dataOffset
            console.log('data', dataOffset)
            const usableBytes = tamanho - bytesToInt([
                data[10],
                data[11],
                data[12],
                data[13]
            ])

            let messageBin = ''
            const messageBreakBin = strToBin(messageBreak)
            for(let i = dataOffset; i < chunk.length; i++){
                messageBin += chunk[i] % 2
                if(messageBin.length % 8 === 0){
                    if(messageBin.indexOf(messageBreakBin)>=0){
                        messageBin = messageBin.substring(0, messageBin.indexOf(messageBreakBin))
                        break
                    }
                }
            }
            console.log('Mensagem: ', binToStr(messageBin))
        }
        this.offset += chunk.length
        callback()
    }
})

// const readStream = fs.createReadStream(file)
// const writeStream = fs.createWriteStream(outputFile)
// readStream.pipe(hideMessage('Walan mota teste msg')).pipe(writeStream)

const readStream = fs.createReadStream(outputFile)
readStream.pipe(showMessage())