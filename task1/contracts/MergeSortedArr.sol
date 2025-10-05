//SPDX-License-Identifier: MIT


pragma solidity ^0.8.30;

contract MergeSortedArr {

    function merge(int[] memory arr1, int[] memory arr2) public pure returns (int[] memory) {

        int[] memory results;

        uint256 len1 = arr1.length;
        uint256 len2 = arr2.length;
        uint256 p1 = 0;
        uint256 p2 = 0;
        uint256 p = 0;

        while(p1 < len1 || p2 < len2) {

            if (p1 < len1 && p2 < len2) {
                if (arr1[p1] < arr2[p2]) {
                    results[p++] = arr1[p1++];
                } else {
                    results[p++] = arr2[p2++];
                }
                continue;
            }

            if (p1 >= len1) {
                results[p++] = arr1[p1++];
                continue;
            }
            
            if (p2 >= len2) {
                results[p++] = arr2[p2++];
                continue;
            }
        }

        return  results;

    }
}