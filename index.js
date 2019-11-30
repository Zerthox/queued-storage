const {writeFile, readFile} = require("fs");

class QueuedStorage {

	constructor() {
		this.queue = {};
	}

	read(file, options = {}) {
		return new Promise((resolve, reject) => {
			const {queue} = this;
			if (queue[file] && queue[file].entries.length > 0) {
				const buffered = Buffer.from(queue[file].entries[queue[file].entries.length - 1].contents);
				if (typeof options === "string") {
					resolve(buffered.toString(options));
				}
				else if (options.encoding) {
					resolve(buffered.toString(options.encoding));
				}
				else {
					resolve(buffered);
				}
			}
			else {
				readFile(file, options, (err, data) => {
					if (err) {
						reject(err);
					}
					else {
						resolve(data);
					}
				});
			}
		});
	}

	write(file, contents, options = {}) {
		return new Promise((resolve, reject) => {
			const {queue} = this;
			if (!queue[file]) {
				queue[file] = {
					pending: false,
					entries: []
				};
			}
			if (queue[file] && queue[file].pending) {
				queue[file].entries.push({contents, options, resolve, reject});
			}
			else {
				queue[file].pending = true;
				queue[file].entries.push({contents, resolve, reject});
				writeFile(file, contents, options, (err) => {
					queue[file].entries.shift();
					if (err) {
						reject(err);
					}
					else {
						resolve();
						queue[file].pending = false;
						if (queue[file].entries.length > 0) {
							const {contents, resolve, reject} = queue[file].entries.shift();
							this.write(file, contents, options).then(() => resolve(), (err) => reject(err));
						}
					}
				});
			}
		});
	}

}

module.exports = QueuedStorage;