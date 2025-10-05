//SPDX-License-Identifier: MIT


pragma solidity ^0.8.30;

contract ReverseString {

    //反转一个字符串。输入 "abcde"，输出 "edcba"

    function reverse(string memory input) public pure returns (string memory) {

        bytes memory byteArray = bytes(input);
        uint256 length = byteArray.length;

        if (length <= 1) return input;

        for (uint256 i = 0; i < length/2; i++) 
        {
            bytes1 tmp = byteArray[i];
            byteArray[i] = byteArray[length - i -1];
            byteArray[length - i -1] = tmp;
        }

        return  string(byteArray);

    }
}