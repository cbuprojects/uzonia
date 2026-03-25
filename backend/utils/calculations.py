from typing import List
from .database import get_last_five_uzonia


async def calculate_10_percent(n: int, ten_percent_value: float, repos_data_list: list) -> List:
    while True:
        diff_value = ten_percent_value - repos_data_list[n][2]
        if diff_value > 0:
            removed_item = repos_data_list.pop(n)
            print(f'removed item: {removed_item}, updated list: {repos_data_list}')
            ten_percent_value = diff_value
        else:
            new_value = abs(diff_value)
            repos_data_list[n][2] = new_value
            break

    return repos_data_list


async def calculte_down_10_percent(n: int, ten_percent_value: float, repos_data_list: list) -> List:
    while True:
        diff_value = ten_percent_value - repos_data_list[n][2]
        if diff_value > 0:
            removed_item = repos_data_list.pop(n)
            print(f'removed item: {removed_item}, updated list: {repos_data_list}')
            ten_percent_value = diff_value
            n -= 1
        else:
            new_value = abs(diff_value)
            repos_data_list[n][2] = new_value
            break

    return repos_data_list


async def calculate_total_sum(repos_data_list: list) -> float:
    value = 0
    for row in repos_data_list:
        value += row[2]

    return value


async def calculate_total_multiplication_sum(repos_data_list: list) -> float:
    total_value = 0
    for row in repos_data_list:
        index = row[1]
        value = row[2]
        total_value = total_value + (value * index)

    return total_value


async def calculate_uzonia_value(total_sum: float, total_multiplication_sum: float) -> float:

    uzonia_value = total_multiplication_sum / total_sum
    uzonia_value = round(uzonia_value, 4)
    uzonia_value = float(f'{uzonia_value:.4f}')
    return uzonia_value


async def calculate_day_uzonia(ten_percent_value: float, repos_data_list: list) -> float:
    repos_data_list = await calculate_10_percent(n=0, ten_percent_value=ten_percent_value, repos_data_list=repos_data_list)
    repos_data_list = await calculte_down_10_percent(n=len(repos_data_list) - 1, ten_percent_value=ten_percent_value,  repos_data_list=repos_data_list)
    total_sum = await calculate_total_sum(repos_data_list)
    total_multiplication_sum = await calculate_total_multiplication_sum(repos_data_list)
    day_uzonia = await calculate_uzonia_value(total_sum, total_multiplication_sum)
    return day_uzonia


async def calculate_cb_rate(cb_rate: float) -> float:
    last_five_uzonia = await get_last_five_uzonia()
    uzonia_cb_rate_sum_list = []
    for uzonia_value in last_five_uzonia:
        uzonia_cb_rate  = uzonia_value - cb_rate
        uzonia_cb_rate_sum_list.append(uzonia_cb_rate)
    uzonia_cb_rate_sum = sum(uzonia_cb_rate_sum_list)

    final_cb_rate = cb_rate + (uzonia_cb_rate_sum / 5)
    return final_cb_rate
