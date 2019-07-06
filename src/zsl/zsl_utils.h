/*
bumo is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

bumo is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with bumo.  If not, see <http://www.gnu.org/licenses/>.
*/

#ifndef ZSL_UTILS_H_
#define ZSL_UTILS_H_
#include<proto/cpp/overlay.pb.h>
using namespace std;
namespace bumo {

	class ZSLPrecompile{
	
	

	};
	
	class ZSLMerkleTree{

	public:
		ZSLMerkleTree(int16_t depth);
		std::vector<string> getEmptyRoots();
		std::vector<string> getEmptyRoot(int64_t depth);
		std::string combine(std::string &left, std::string &right);
		int64_t getLeafIndex(std::string &cm);
		std::string getCommitmentAtLeafIndex(int64_t index);
		void addCommitment(std::string &cm);
		bool commitmentExists(std::string& cm);
		std::vector<string> root();
		std::string _calcSubtree(int64_t &index, int64_t &item_depth);
		void getWitness(std::string& cm);
		int64_t leftShift(int64_t v, int64_t n);
		int64_t rightShift(int64_t v, int64_t n);

	private:
		void _createEmptyRoots(int64_t depth);


	private:
		ZSLPrecompile zsl_;
		int64_t tree_depth_;
		int64_t max_num_elements_;
		std::vector<string> empty_roots_;
		int64_t num_commitments_;
		std::map<string, int64_t> map_commitment_indices_;
		std::map<int64_t, string> map_commitments_;

	};


}
#endif