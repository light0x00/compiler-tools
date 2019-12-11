let obj = {};
Object.defineProperty(obj, "aa", {
	value: "aaa",
	writable: true,
	enumerable: true,
	configurable: true
});
console.log(obj);