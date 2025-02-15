// Copyright 2019-2022 PureStake Inc.
// This file is part of Moonbeam.

// Moonbeam is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Moonbeam is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Moonbeam.  If not, see <http://www.gnu.org/licenses/>.

#![cfg_attr(not(feature = "std"), no_std)]

extern crate alloc;

use crate::alloc::borrow::ToOwned;
use fp_evm::{Context, ExitError, ExitRevert, PrecompileFailure};
use frame_support::{
    dispatch::{Dispatchable, GetDispatchInfo, PostDispatchInfo},
    traits::Get,
    weights::Weight,
};
use pallet_evm::{GasWeightMapping, Log};
use sp_core::{H160, H256, U256};
use sp_std::{marker::PhantomData, vec, vec::Vec};

/// Alias for Result returning an EVM precompile error.
pub type EvmResult<T = ()> = Result<T, PrecompileFailure>;

/// Return an error with provided (static) text.
/// Using the `revert` function of `Gasometer` is preferred as erroring
/// consumed all the gas limit and the error message is not easily
/// retrievable.
#[allow(dead_code)]
pub fn error<T: Into<alloc::borrow::Cow<'static, str>>>(text: T) -> PrecompileFailure {
    PrecompileFailure::Error {
        exit_status: ExitError::Other(text.into()),
    }
}

/// Builder for PrecompileOutput.
#[derive(Clone, Debug)]
pub struct LogsBuilder {
    address: H160,
    logs: Vec<Log>,
}

#[allow(dead_code)]
impl LogsBuilder {
    /// Create a new builder with no logs.
    /// Takes the address of the precompile (usually `context.address`).
    pub fn new(address: H160) -> Self {
        Self {
            logs: vec![],
            address,
        }
    }

    /// Returns the logs array.
    pub fn build(self) -> Vec<Log> {
        self.logs
    }

    /// Add a 0-topic log.
    pub fn log0<D>(mut self, data: D) -> Self
    where
        D: Into<Vec<u8>>,
    {
        self.logs.push(Log {
            address: self.address,
            data: data.into(),
            topics: vec![],
        });
        self
    }

    /// Add a 1-topic log.
    pub fn log1<D, T0>(mut self, topic0: T0, data: D) -> Self
    where
        D: Into<Vec<u8>>,
        T0: Into<H256>,
    {
        self.logs.push(Log {
            address: self.address,
            data: data.into(),
            topics: vec![topic0.into()],
        });
        self
    }

    /// Add a 2-topics log.
    pub fn log2<D, T0, T1>(mut self, topic0: T0, topic1: T1, data: D) -> Self
    where
        D: Into<Vec<u8>>,
        T0: Into<H256>,
        T1: Into<H256>,
    {
        self.logs.push(Log {
            address: self.address,
            data: data.into(),
            topics: vec![topic0.into(), topic1.into()],
        });
        self
    }

    /// Add a 3-topics log.
    pub fn log3<D, T0, T1, T2>(mut self, topic0: T0, topic1: T1, topic2: T2, data: D) -> Self
    where
        D: Into<Vec<u8>>,
        T0: Into<H256>,
        T1: Into<H256>,
        T2: Into<H256>,
    {
        self.logs.push(Log {
            address: self.address,
            data: data.into(),
            topics: vec![topic0.into(), topic1.into(), topic2.into()],
        });
        self
    }

    /// Add a 4-topics log.
    pub fn log4<D, T0, T1, T2, T3>(
        mut self,
        topic0: T0,
        topic1: T1,
        topic2: T2,
        topic3: T3,
        data: D,
    ) -> Self
    where
        D: Into<Vec<u8>>,
        T0: Into<H256>,
        T1: Into<H256>,
        T2: Into<H256>,
        T3: Into<H256>,
    {
        self.logs.push(Log {
            address: self.address,
            data: data.into(),
            topics: vec![topic0.into(), topic1.into(), topic2.into(), topic3.into()],
        });
        self
    }
}

/// Helper functions requiring a Runtime.
/// This runtime must of course implement `pallet_evm::Config`.
#[derive(Clone, Copy, Debug)]
pub struct RuntimeHelper<Runtime>(PhantomData<Runtime>);

impl<Runtime> RuntimeHelper<Runtime>
where
    Runtime: pallet_evm::Config,
    Runtime::Call: Dispatchable<PostInfo = PostDispatchInfo> + GetDispatchInfo,
{
    /// Try to dispatch a Substrate call.
    /// Return an error if there are not enough gas, or if the call fails.
    /// If successful returns the used gas using the Runtime GasWeightMapping.
    #[allow(dead_code)]
    pub fn try_dispatch<Call>(
        origin: <Runtime::Call as Dispatchable>::Origin,
        call: Call,
        gasometer: &mut Gasometer,
    ) -> EvmResult<()>
    where
        Runtime::Call: From<Call>,
    {
        let call = Runtime::Call::from(call);
        let dispatch_info = call.get_dispatch_info();

        // Make sure there is enough gas.
        if let Some(gas_limit) = gasometer.remaining_gas()? {
            let required_gas = Runtime::GasWeightMapping::weight_to_gas(dispatch_info.weight);
            if required_gas > gas_limit {
                return Err(PrecompileFailure::Error {
                    exit_status: ExitError::OutOfGas,
                });
            }
        }

        // Dispatch call.
        // It may be possible to not record gas cost if the call returns Pays::No.
        // However while Substrate handle checking weight while not making the sender pay for it,
        // the EVM doesn't. It seems this safer to always record the costs to avoid unmetered
        // computations.
        let used_weight = call
            .dispatch(origin)
            .map_err(|e| {
                gasometer.revert(alloc::format!("Dispatched call failed with error: {:?}", e))
            })?
            .actual_weight;

        let used_gas =
            Runtime::GasWeightMapping::weight_to_gas(used_weight.unwrap_or(dispatch_info.weight));

        gasometer.record_cost(used_gas)?;

        Ok(())
    }
}

impl<Runtime> RuntimeHelper<Runtime>
where
    Runtime: pallet_evm::Config,
{
    /// Cost of a Substrate DB write in gas.
    pub fn db_write_gas_cost() -> u64 {
        <Runtime as pallet_evm::Config>::GasWeightMapping::weight_to_gas(Weight::from_ref_time(
            <Runtime as frame_system::Config>::DbWeight::get().write,
        ))
    }

    /// Cost of a Substrate DB read in gas.
    pub fn db_read_gas_cost() -> u64 {
        <Runtime as pallet_evm::Config>::GasWeightMapping::weight_to_gas(Weight::from_ref_time(
            <Runtime as frame_system::Config>::DbWeight::get().read,
        ))
    }
}

/// Represents modifiers a Solidity function can be annotated with.
#[derive(Copy, Clone, PartialEq, Eq)]
pub enum FunctionModifier {
    /// Function that doesn't modify the state.
    View,
    /// Function that modifies the state but refuse receiving funds.
    /// Correspond to a Solidity function with no modifiers.
    NonPayable,
    /// Function that modifies the state and accept funds.
    Payable,
}

/// Custom Gasometer to record costs in precompiles.
/// It is advised to record known costs as early as possible to
/// avoid unnecessary computations if there is an Out of Gas.
///
/// Provides functions related to reverts, as reverts takes the recorded amount
/// of gas into account.
#[derive(Clone, Copy, Debug)]
pub struct Gasometer {
    target_gas: Option<u64>,
    used_gas: u64,
}

impl Gasometer {
    /// Create a new Gasometer with provided gas limit.
    /// None is no limit.
    pub fn new(target_gas: Option<u64>) -> Self {
        Self {
            target_gas,
            used_gas: 0,
        }
    }

    /// Record cost, and return error if it goes out of gas.
    pub fn record_cost(&mut self, cost: u64) -> EvmResult {
        self.used_gas = self
            .used_gas
            .checked_add(cost)
            .ok_or(PrecompileFailure::Error {
                exit_status: ExitError::OutOfGas,
            })?;

        match self.target_gas {
            Some(gas_limit) if self.used_gas > gas_limit => Err(PrecompileFailure::Error {
                exit_status: ExitError::OutOfGas,
            }),
            _ => Ok(()),
        }
    }

    /// Compute remaining gas.
    /// Returns error if out of gas.
    /// Returns None if no gas limit.
    pub fn remaining_gas(&self) -> EvmResult<Option<u64>> {
        Ok(match self.target_gas {
            None => None,
            Some(gas_limit) => Some(gas_limit.checked_sub(self.used_gas).ok_or(
                PrecompileFailure::Error {
                    exit_status: ExitError::OutOfGas,
                },
            )?),
        })
    }

    /// Revert the execution, making the user pay for the the currently
    /// recorded cost. It is better to **revert** instead of **error** as
    /// erroring consumes the entire gas limit, and **revert** returns an error
    /// message to the calling contract.
    ///
    /// TODO : Record cost of the input based on its size and handle Out of Gas ?
    /// This might be required if we format revert messages using user data.
    pub fn revert(&self, output: impl AsRef<[u8]>) -> PrecompileFailure {
        PrecompileFailure::Revert {
            exit_status: ExitRevert::Reverted,
            output: output.as_ref().to_owned(),
        }
    }

    /// Check that a function call is compatible with the context it is
    /// called into.
    pub fn check_function_modifier(
        &self,
        context: &Context,
        is_static: bool,
        modifier: FunctionModifier,
    ) -> EvmResult {
        if is_static && modifier != FunctionModifier::View {
            return Err(self.revert("can't call non-static function in static context"));
        }

        if modifier != FunctionModifier::Payable && context.apparent_value > U256::zero() {
            return Err(self.revert("function is not payable"));
        }

        Ok(())
    }
}
