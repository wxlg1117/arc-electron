const log = require('electron-log');

class ArcBase {

  constructor() {
    this._ipcRequestId = 0;
    this._promises = [];
    this.ipcPromiseCallback = this.ipcPromiseCallback.bind(this);
  }

  _debounceIndex(name) {
    return this._debouncers.findIndex(item => item.name === name);
  }
  /**
   * Prohibits execution of a task for some `time`.
   *
   * The task is executed at the end of this time.
   *
   * ```
   * this.debounce('ajax-call', function() {
   *  this.makeAjaxCall();
   * }, 2000);
   * ```
   *
   * @param {String} name Name of the task
   * @param {Function} callback A function to call.
   * @param {Number} time Number of milliseconds after which the task is executed.
   */
  debounce(name, callback, time) {
    if (!this._debouncers) {
      this._debouncers = [];
    }
    var index = this._debounceIndex(name);
    if (index !== -1) {
      return;
    }
    var cancelId = setTimeout(() => {
      var index = this._debounceIndex(name);
      this._debouncers.splice(index, 1);
      callback.call(this);
    }, time);

    this._debouncers.push({
      name: name,
      id: cancelId
    });
  }
  /**
   * Cancels previously set debounce timer.
   *
   * @param {String} name Name of the task
   */
  cancelDebounce(name) {
    var index = this._debounceIndex(name);
    if (index === -1) {
      return;
    }
    var debounce = this._debouncers[index];
    clearTimeout(debounce.id);
    this._debouncers.splice(index, 1);
  }
  /**
   * Generates ID for the next IPC call with a promise.
   *
   * @return {Number} ID of the IPC call
   */
  nextIpcRequestId() {
    return ++this._ipcRequestId;
  }
  /**
   * Appends new Promise object to the list of promises.
   *
   * @param {Number} id ID of the IPC call
   * @return {Promise} Generated Promise object.
   */
  appendPromise(id) {
    var p = new Promise((resolve, reject) => {
      let obj = {
        id: id,
        resolve: resolve,
        reject: reject
      };
      this._promises.push(obj);
    });
    return p;
  }

  ipcPromiseCallback(event, id, isError, ...args) {
    log.info('Received IPC response for id', id, ', is error? ', isError, args);
    var index = this._promises.findIndex(p => p.id === id);
    if (index === -1) {
      log.error('IPC promise for id', id, ' not found');
      throw new Error('Promise not found');
    }
    var promise = this._promises[index];
    this._promises.splice(index, 1);
    if (isError) {
      log.info('Rejecting IPC promise');
      promise.reject.apply(promise, args);
    } else {
      log.info('Resolving IPC promise');
      promise.resolve.apply(promise, args);
    }
  }
}
exports.ArcBase = ArcBase;
