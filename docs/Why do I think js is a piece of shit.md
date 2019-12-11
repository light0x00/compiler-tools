```
class Fuck extends Array {
	constructor(...a) {
		super(...a);
		console.log(a.length);  //output: 1
	}
}
console.log(new Fuck(0).length);  //output: 0
console.log(new Fuck(1).length);  //output: 1
```