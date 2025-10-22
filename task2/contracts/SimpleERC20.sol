// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract MyERC20Token  {

    string public constant name = "MyERC20Token";
    string public constant symbol = "M20TK";
    uint8 public constant decimals = 18;

    uint256 private _totalSupply;
    address public _owner;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 initialSupply) {
        _owner = msg.sender;
        _totalSupply = initialSupply;
        mint(_owner, initialSupply);
    }

    function mint(address to, uint256 amount) public {
        require(msg.sender == _owner, "Only owner can mint");
        _mint(to, amount);
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function totalSupply() external view returns (uint256) {
        return  _totalSupply;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return  true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
       
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return  true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        
        _approve(msg.sender,spender,amount);
        
        return true;
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }


    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "ERC20: mint to the zero address");
        _balances[to] += amount;
        _totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {

        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");

        _balances[from] = fromBalance - amount;
        _balances[to] += amount;
        emit  Transfer(from, to, amount);
    }


    function _approve(address owner, address spender, uint256 amount) internal {

        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit  Approval(owner, spender, amount);
    }


    function _spendAllowance(address owner, address spender, uint256 amount) internal {

        uint256 currentAllowance = allowance(owner, spender);

        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            _approve(owner, spender, currentAllowance - amount);
        }
    }

}