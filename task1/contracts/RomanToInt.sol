//SPDX-License-Identifier: MIT


pragma solidity ^0.8.30;

contract RomanToInt {

    mapping (bytes1=>uint256) romanValues;

    constructor() {
        // 初始化映射
        romanValues['I'] = 1;
        romanValues['V'] = 5;
        romanValues['X'] = 10;
        romanValues['L'] = 50;
        romanValues['C'] = 100;
        romanValues['D'] = 500;
        romanValues['M'] = 1000;
    }


    function romanToInt(string memory s) public view returns (uint256) {
        
        bytes memory roman = bytes(s);
        uint256 total = 0;
        uint256 prevValue = 0;

        for (uint256 i = roman.length; i > 0; i--) {
            bytes1 currentChar = roman[i - 1];
            uint256 currentValue = romanValues[currentChar];

            if (currentValue < prevValue) {
                    total -= currentValue; // 处理 IV, IX 等情况
            }else {
                    total += currentValue;
            }
            prevValue = currentValue;
        }

        return  total;
    }   

}