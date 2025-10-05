//SPDX-License-Identifier: MIT


pragma solidity ^0.8.30;

contract IntToRoman {

    struct RomanNumeral {
        uint256 value;
        string symbol;
    }

    RomanNumeral[] private romanNumerals;

    constructor() {
        romanNumerals.push(RomanNumeral(1000, "M"));
        romanNumerals.push(RomanNumeral(900, "CM"));
        romanNumerals.push(RomanNumeral(500, "D"));
        romanNumerals.push(RomanNumeral(400, "CD"));
        romanNumerals.push(RomanNumeral(100, "C"));
        romanNumerals.push(RomanNumeral(90, "XC"));
        romanNumerals.push(RomanNumeral(50, "L"));
        romanNumerals.push(RomanNumeral(40, "XL"));
        romanNumerals.push(RomanNumeral(10, "X"));
        romanNumerals.push(RomanNumeral(9, "IX"));
        romanNumerals.push(RomanNumeral(5, "V"));
        romanNumerals.push(RomanNumeral(4, "IV"));
        romanNumerals.push(RomanNumeral(1, "I"));
    }

    function intToRoman(uint256 num) public view returns (string memory) {

        require((num > 1 && num < 3999), "value out of range (1~3999)");

        bytes memory result;

        for (uint256 i = 0; i < romanNumerals.length; i ++) 
        {
            RomanNumeral memory romanNumeral = romanNumerals[i];
            while (num > romanNumeral.value) {
                result = abi.encodePacked(result, romanNumeral.symbol);
                num -= romanNumeral.value;
            }
        }

        return string(result);
    }

}