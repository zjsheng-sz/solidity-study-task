//SPDX-License-Identifier: MIT


pragma solidity ^0.8.30;


contract BinarySearch {
    
    function binarySearch(int num, int[] calldata sortedNums) public pure returns (uint index) {

        return  binarySearchIntenal(num, sortedNums);
    }

    function binarySearchIntenal(int num, int[] calldata sortedNums) private  pure returns (uint index) {

        uint256 len = sortedNums.length;
        uint256 mid = len/2;

        if (num == sortedNums[mid]) {
            return mid;
        }

        if (num < sortedNums[mid]) {
            return  binarySearchIntenal(num, sortedNums[0:mid]);
        }else {
            return  binarySearchIntenal(num, sortedNums[mid:len]);
        }

    }
}