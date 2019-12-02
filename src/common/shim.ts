export class Stack<T> extends Array<T>{
	/* push/pop/peek */
	peek(): T {
		return this[this.length - 1];
	}
}

export class Queue<T> {
	private arr: Array<T>
	constructor(...items: T[]) {
		this.arr = new Array<T>(...items);
	}

	get(i: number): T | undefined {
		return this.arr[i];
	}
	peekFirst(): T | undefined {
		return this.arr[0];
	}
	peekLast(): T | undefined {
		return this.arr[this.arr.length - 1];
	}
	addFirst(element: T) {
		this.arr.unshift(element);
	}
	addLast(element: T) {
		this.arr.push(element);
	}
	removeLast(): T | undefined {
		return this.arr.pop();
	}
	removeFirst(): T | undefined {
		return this.arr.shift();
	}
	size(): number {
		return this.arr.length;
	}
}


export function addAll_Map(to: Map<any, any>, from: Map<any, any>) {
	for (let [k, v] of from)
		to.set(k, v);
	return to;
}
export function addAll_Set(to: Set<any>, from: Set<any>) {
	for (let v of from) {
		to.add(v);
	}
	return to;
}
export function isIterable(obj: any): obj is Iterable<any> {
	if (obj == null) {
		return false;
	}
	return typeof obj[Symbol.iterator] === "function";
}

export function assert(condition: boolean, msg?: string): asserts condition {
	if (!condition) {
		throw new Error(`Assert Error: ${msg}`);
	}
}

export class MismatchError extends Error {
	constructor(expected: Object, actual: Object) {
		let err_msg;
		if (isIterable(expected)) {
			let expectation = "";
			for (let e of expected) {
				expectation += e + ",";
			}
			expectation = expectation.replace(/,$/, "");
			err_msg = `The expected input is one of ${expectation},but actually ${actual}`;
		}
		else {
			err_msg = `The expected input is ${expected},but actually ${actual}`;
		}
		super(err_msg);
	}
}