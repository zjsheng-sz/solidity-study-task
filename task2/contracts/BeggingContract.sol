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
    function donate() payable public returns (bool) {
        require(msg.value > 0, "amount need greater 0");

        require(block.timestamp < _endtime, "time out");

        if (_donateAmont[msg.sender] == 0) {
            _acounts.push(msg.sender);
        }

        _donateAmont[msg.sender] += msg.value;

        emit Donation(msg.sender, msg.value);
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

            // 创建内存副本避免修改原始数据
        address[] memory accountsCopy = new address[](_acounts.length);
        for (uint i = 0; i < _acounts.length; i++) {
            accountsCopy[i] = _acounts[i];
        }

        for (uint256 i = 0; i < accountsCopy.length; i++) 
        {
            for (uint256 j = i + 1; j < accountsCopy.length ; j++) 
            {
                if ( _donateAmont[accountsCopy[i]] < _donateAmont[accountsCopy[i]]) {
                        address tmp = accountsCopy[i];
                        accountsCopy[i] = accountsCopy[j];
                        accountsCopy[j] = tmp;
                }
            }
        }

        if (accountsCopy.length >= 1) {
            top3[0] = accountsCopy[0];
        }
        
        if (accountsCopy.length >= 2) {
            top3[1] = accountsCopy[1];
        }

        if (accountsCopy.length >= 3) {
            top3[2] = accountsCopy[2];
        }
        return top3;
    
    }

}
