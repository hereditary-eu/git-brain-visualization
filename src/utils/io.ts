function handleFileDrop(dataTransfer: DataTransfer){
    let files : Array<File> = []
    if (dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        [...dataTransfer.items].forEach((item, i) => {
            // If dropped items aren't files, reject them
            if (item.kind === "file") {
                const file = item.getAsFile();
                if(file){
                    files.push(file)
                }
            }
        });
    } else {
        // Use DataTransfer interface to access the file(s)
        [...dataTransfer.files].forEach((file, i) => {
            if(file){
                files.push(file)
            }
        });
    }

    return files;
}

export { handleFileDrop }