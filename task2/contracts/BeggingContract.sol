// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract BeggingContract {

    mapping (address=>uint256) _donateAmont; 
    address public _owner;
    address[] _acounts;
    uint256 public _endtime;    // 捐赠结束时间3天


    constructor(uint256 endDay) {
        _owner = msg.sender;
        _endtime = block.timestamp + endDay*1 days;
    }

    modifier onlyOwner() {
        require(_owner == msg.sender, "not owner");
        _;
    }

    event Donation(address account, uint256 amount);

    //允许用户向合  约发送以太币，并记录捐赠信息
    function donate(uint256 amount) payable public returns (bool) {
        require(amount > 0, "amount need greater 0");

        require(block.timestamp < _endtime, "time out");

        if (_donateAmont[msg.sender] == 0) {
            _acounts.push(msg.sender);
        }

        _donateAmont[msg.sender] += amount;

        emit Donation(msg.sender, amount);
        return true;
    }

    //允许合约所有者提取所有资金
    function withdraw() public onlyOwner returns (bool) {
        uint256 amount = address(this).balance;
        require(amount > 0, "amount need greater 0");
        payable(msg.sender).transfer(amount);
        return true;
    }


    //允许查询某个地址的捐赠金额
    function getDonation(address account) public view returns (uint256) {
        return _donateAmont[account];
    }


    //显示捐赠金额最多的前 3 个地址
    function getTop3() public returns (address[3] memory top3) {

        if (_acounts.length == 0)  {
            return top3;
        }

        for (uint256 i = 0; i < _acounts.length; i++) 
        {
            for (uint256 j = i + 1; j < _acounts.length ; j++) 
            {
                if ( _donateAmont[_acounts[i]] < _donateAmont[_acounts[i]]) {
                        address tmp = _acounts[i];
                        _acounts[i] = _acounts[j];
                        _acounts[j] = tmp;
                }
            }
        }

        if (_acounts.length >= 1) {
            top3[0] = _acounts[0];
        }
        
        if (_acounts.length >= 2) {
            top3[1] = _acounts[1];
        }

        if (_acounts.length >= 3) {
            top3[2] = _acounts[2];
        }
        return top3;
    
    }

}
