
# First

```
求First集算法 需要考虑的一些极端情况

1 自递归

	S-AS
	A->a|ε

	在求First(S)时, 由于 ε ∈ First(A),所以需要继续寻找后一个字符的First集
	但是后一个字符就是S本身,这种时候,需要防止自递归.

2 左递归
	如果一个非终结符A的右部以其自身开头,则该产生式被忽略

	对于如下文法,first(E)为空
		E->E+T
		T->id

	对于如下文法,First(E) = First(T) = First(F) = {(,id)}
		E->E+T | T
		T->T*F | F
		F->(E) | id
3. 循环依赖

	A->B
	B->A

```

# Follow
```
计算Follow集需考虑以下几种情况

1. 后跟终结符
S -> Ab

Follow(A)=b

2. 后跟非ε的非终结符

S -> AB
B -> a | b

因为 ε ∉ First(B),Follow(A)=First(B)

3. 后跟可ε的非终结符1

S -> AB
B -> b | ε

求Follow(A)时,A后面跟了一个B,所有添加First(B)
因为 ε ∈ First(B), 且B是产生式S的最右符号,所以添加Follow{S}
Follow(A)=(First(B) U Follow{S} - {ε})={b,$}

3. 后跟可ε的非终结符

S -> ABC
B -> b | ε
C -> c

求Follow(A)时,因为 ε ∈ First(B),且ε ∉ First(C), 所以 Follow(A)= (First(B) U First(C) - {ε} )={b,c}

4. 后跟连续的可ε的非终结符

S -> ABC
B -> b | ε
C -> c | ε

求Follow(A)
因为 ε ∈ First(B),且ε ∈ First(C),且C是最右符号, 所以 Follow(A)= (First(B) U First(C) U Follow(S) - {ε} )={b,c}

5. 连续重复

S->AAB
A->a
B->b | 𝝴

求Follow(A)
因为第一个A(称为A1)后面跟了一个A(称为A2),所以Follow(A)一定包含First(A)
又因为A2后面跟着B, 所以 Follow(A) 一定包含First(B)
又因为𝝴 ∈ First(B),所以Follow(A)一定包含Follow(S)
综上所述,Follow(A)=First(A) U First(B) U Follow(S)

6. 重复添加

S->AAA
A->a

求Follow(A)时, 遇到的第一的A(称为A1)的后面跟了一个A(称为A2),所以添加 First(A),
在A2的后面也跟了一个A(称为A3),这时如果再添加一次First(A)就会添加重复的符号到Follow(A)

7. 自递归

对形如 A-aA 的产生式,求Follow(A)时
按一般情况,右侧的A虽然是最右符号,应当继续求所在产生式A的Follow集
但问题是,A已经处于自己的产生式A中,这种情况再求Follow(A),就死循环了.

9. 循环依赖

A->B
B->A

求Follow(A)时,需要求Follow(B), 求Follow(B)时,需要求Follow(A)
```