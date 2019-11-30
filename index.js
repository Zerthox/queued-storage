const {writeFile, readFile} = require("fs");

class QueuedStorage {

	constructor() {
		this.queue = {};
	}

	read(path, options = {}) {
		return new Promise((resolve, reject) => {
			const {queue} = this;
			if (queue[path] && queue[path].entries.length > 0) {
				const buffered = Buffer.from(queue[path].entries[queue[path].entries.length - 1].data);
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
				readFile(path, options, (err, data) => {
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

	write(path, data, options = {}) {
		return new Promise((resolve, reject) => {
			const {queue} = this;
			if (!queue[path]) {
				queue[path] = {
					pending: false,
					entries: []
				};
			}
			const file = queue[path];
			if (file.pending) {
				file.entries.push({data, options, resolve, reject});
			}
			else {
				file.pending = true;
				file.entries.push({data, resolve, reject});
				writeFile(path, data, options, (err) => {
					file.entries.shift();
					if (err) {
						reject(err);
					}
					else {
						resolve();
						file.pending = false;
						if (file.entries.length > 0) {
							const {data, resolve, reject} = file.entries.shift();
							this.write(path, data, options).then(() => resolve(), (err) => reject(err));
						}
					}
				});
			}
		});
	}

}

module.exports = QueuedStorage;