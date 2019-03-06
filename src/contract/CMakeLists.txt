#bumo contract module CmakeLists.txt -- libbumo_contract.a

set(LIB_BUMO_CONTRACT bumo_contract)

#Automatically get src files from the specified directory
aux_source_directory(${BUMO_SRC_DIR}/contract/ CONTRACT_SRC)

#Generate static library files
add_library(${LIB_BUMO_CONTRACT} ${CONTRACT_SRC})

#Specify compiling options for target objects
target_compile_options(${LIB_BUMO_CONTRACT}
    PUBLIC -std=c++11 
    PUBLIC -DASIO_STANDALONE
    PUBLIC -D_WEBSOCKETPP_CPP11_STL_
    PUBLIC -D${OS_NAME}
)
