//SPDX-License-Identifier: MIT


pragma solidity ^0.8.30;

contract Voting {

    mapping (address=>uint256) candidateToVoteNum;
    address[] candidates;
    
    function vote(address candidate) public  {

        if (candidateToVoteNum[candidate] == 0 ) {
            candidates.push(candidate);
        }

        candidateToVoteNum[candidate] ++;

    }


    function getVotes(address candidate) public view returns (uint256) {

        return  candidateToVoteNum[candidate];

    }

    function resetVotes() public {

        for (uint i = 0; i < candidates.length; i++) 
        {  
            candidateToVoteNum[candidates[i]] = 0;
        }

    }
}
