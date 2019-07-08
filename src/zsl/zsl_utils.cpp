#include "zsl_utils.h"
#include<common/general.h>
#include <vector>
#include <iostream>
#include <algorithm>
#include<map>
using namespace std;
namespace bumo{

	ZSLMerkleTree::ZSLMerkleTree(int16_t depth){
		//zsl = ZSLPrecompile(new ZSLPrecompile());
		tree_depth_ = depth;
		max_num_elements_ = pow(2, depth);;
		_createEmptyRoots(depth);
	}


	void ZSLMerkleTree::_createEmptyRoots(int64_t depth){
		std::string root = 0x00;
		empty_roots_.push_back(root);
		for (int64_t i = 0; i<depth - 1; i++) {
			root = combine(root, root);
			empty_roots_.push_back(root);
		}
	}

	std::vector<string> ZSLMerkleTree::getEmptyRoots(){
		return empty_roots_;
	}

	std::string ZSLMerkleTree::getEmptyRoot(int64_t depth){
		if (depth < empty_roots_.size()){
			std::string &empty_root = empty_roots_[depth];
			return empty_root;
		}
	}

	std::string ZSLMerkleTree::combine(std::string &left, std::string &right){
		return utils::String::BinToHexString(HashWrapper::Crypto(left + right)).c_str();
	}

	int64_t ZSLMerkleTree::getLeafIndex(std::string &cm){
		int64_t map_index = map_commitment_indices_[cm];
		if (map_index > 0);
		return map_index + 1;
	}

	std::string ZSLMerkleTree::getCommitmentAtLeafIndex(int64_t index){
		if (index < num_commitments_){
			int64_t map_index = index + 1;
			return map_commitments_[map_index];
		}
	}

	void ZSLMerkleTree::addCommitment(std::string &cm){
		// Only allow a commitment to be added once to the tree
		auto itr = map_commitment_indices_.find(cm);
		if (itr != map_commitment_indices_.end()){
			return;
		}

		// Is tree full?
		if (num_commitments_ >= max_num_elements_){
			return;
		}

		// Add new commitment
		int64_t map_index = ++num_commitments_;
		map_commitment_indices_[cm] = map_index;
		map_commitments_[map_index] = cm;
	}

	bool ZSLMerkleTree::commitmentExists(std::string& cm){
		auto itr = map_commitment_indices_.find(cm);
		if (itr != map_commitment_indices_.end()){
			return true;
		}
	}

	std::string ZSLMerkleTree::_calcSubtree(int64_t index, int64_t item_depth){
		// Use pre-computed empty tree root if we know other half of tree is empty
		if (num_commitments_ <= leftShift(index, item_depth)) {
			return empty_roots_[item_depth];
		}

		if (item_depth == 0) {
			int64_t mapIndex = index + 1;
			return map_commitments_[mapIndex];
		}
		else {
			std::string left = _calcSubtree(leftShift(index, 1), item_depth - 1);
			std::string right = _calcSubtree(leftShift(index, 1) + 1, item_depth - 1);
			return combine(left, right);
		}
	}

	void ZSLMerkleTree::getWitness(std::string& cm){

	}

	int64_t ZSLMerkleTree::leftShift(int64_t v, int64_t n){
		return v *pow(2,n);
	}

	int64_t ZSLMerkleTree::rightShift(int64_t v, int64_t n){
		return v / (pow(2, n));
	}

};